from datetime import date
import os
import json
from typing import List, Union

from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from mangum import Mangum

import snowflake.connector

SNOW_DATABASE = os.getenv('SNOW_DATABASE')
SNOW_SCHEMA = 'TPCH_SF10'
SNOW_ACCOUNT = os.getenv('SNOW_ACCOUNT')
SNOW_USER = os.getenv('SNOW_USER')
SNOW_PASSWORD = os.getenv('SNOW_PASSWORD')
SNOW_WAREHOUSE = os.getenv('SNOW_WAREHOUSE')
TOKEN=os.getenv('FAST_API_DEMO_TOKEN')
DB = f"{SNOW_DATABASE}.{SNOW_SCHEMA}"

print(f'--> Token: {TOKEN}')

DEFAULT_CUSTOMER = json.loads(
    '{"id": 0, "name": "Test Name", "addres": "Test Address", "account_balance": 100.4, "phone": "Test Phone", "comment": "Test Comment"}')


class OrderHistory(BaseModel):
    ticks: List[str] = []
    totals: List[str] = []


class CustomerOrderSummary(BaseModel):
    id: int
    name: str
    first_order_date: date
    last_order_date: date
    total_orders_value: float
    order_history: OrderHistory = OrderHistory()


print('--> Loading FastAPI')
app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print('--> Loading Mangum')
handler = Mangum(app)

print('--> Connecting to Snowflake')
ctx = snowflake.connector.connect(user=SNOW_USER, password=SNOW_PASSWORD, account=SNOW_ACCOUNT)

print('--> Configuring routes')

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")

@app.get("/top_customers")
async def top_customers(authorization: Union[str, None] = Header(default=None)):
    print(f'Auth: {authorization}')
    authorize(authorization)
    return list_top_customers()


@app.get("/backend")
async def backend(authorization: Union[str, None] = Header(default=None)):
    authorize(authorization)
    return {"data_store_version": get_snow_version()}


@app.get("/customer/{customer_id}")
async def get_customer(customer_id: int, authorization: Union[str, None] = Header(default=None)):
    authorize(authorization)
    try:
        return get_customer(customer_id)
    except:
        if customer_id == DEFAULT_CUSTOMER['id']:
            return DEFAULT_CUSTOMER
        else:
            raise HTTPException(404, f"Customer not found")


@app.get("/customer/{customer_id}/order_summary")
async def get_customer_order_summary(customer_id: int, authorization: Union[str, None] = Header(default=None)):
    authorize(authorization)
    res = get_customer_order_summary(customer_id)
    if res is None:
        raise HTTPException(404, f"No orders founds for this customer")

    return res

def authorize(token):
    # TEMP: for a simple demo some fixed token value here, for anything else implement proper authorization
    if token == f'Bearer {TOKEN}':
        return True
    raise HTTPException(401)

def get_snow_version():
    cursor = ctx.cursor()
    try:
        cursor.execute("SELECT current_version()")
        return cursor.fetchone()[0]
    finally:
        cursor.close()


def get_customer(customer_id):
    res = []
    cursor = ctx.cursor()
    try:
        cursor.execute(f"USE WAREHOUSE {SNOW_WAREHOUSE}")
        sql = f"SELECT C_CUSTKEY, C_NAME, C_ADDRESS, C_PHONE, C_ACCTBAL, C_COMMENT FROM {DB}.CUSTOMER WHERE C_CUSTKEY = {customer_id}"
        print(sql)
        cursor.execute(sql)
        row = cursor.fetchone()
        print(row)
        return {"id": row[0], "name": row[1], "address": row[2], "phone": row[3], "account_balance": row[4], "comment": row[5]}
    finally:
        cursor.close()


def list_top_customers():
    res = []
    cursor = ctx.cursor()
    try:
        cursor.execute(f"USE WAREHOUSE {SNOW_WAREHOUSE}")
        sql = f"""SELECT C_CUSTKEY, C_NAME, O.ORDER_TOTAL FROM {DB}.CUSTOMER C 
            INNER JOIN (SELECT O_CUSTKEY, SUM(O_TOTALPRICE) AS ORDER_TOTAL FROM {DB}.ORDERS GROUP BY 1 ORDER BY 2 DESC LIMIT 10) O ON C.C_CUSTKEY = O.O_CUSTKEY"""
        cursor.execute(sql)
        for row in cursor:
            res.append({"id": row[0], "name": row[1], "order_total": row[2]})
    finally:
        cursor.close()

    return res

def get_customer_order_summary(customer_id):
    res = None
    cursor = ctx.cursor()
    try:
        cursor.execute(f"USE WAREHOUSE {SNOW_WAREHOUSE}")
        sql = f"""
        WITH CO AS (
            SELECT C.*, O.*
            FROM {DB}.CUSTOMER C INNER JOIN {DB}.ORDERS O ON C.C_CUSTKEY = O.O_CUSTKEY
            WHERE C_CUSTKEY = {customer_id}
        )
        SELECT T1.*, T2.ts, T2.MonthlyTotal, T2.TotalOrdersValue2
        FROM (SELECT C_CUSTKEY, C_NAME, MIN(O_ORDERDATE) AS FirstOrderDate, MAX(O_ORDERDATE) AS LasttOrderDate, SUM(O_TOTALPRICE) AS TotalOrdersValue FROM CO GROUP BY 1, 2) T1 
        INNER JOIN 
        (SELECT C_CUSTKEY, TO_VARCHAR(O_ORDERDATE, 'yyyy-mm') AS ts, SUM(O_TOTALPRICE) AS MonthlyTotal, SUM(SUM(O_TOTALPRICE)) OVER() TotalOrdersValue2 FROM CO GROUP BY 1, 2) T2 
        ON T1.C_CUSTKEY = T2.C_CUSTKEY
        ORDER BY T2.ts;
        """
        cursor.execute(sql)
        for row in cursor:
            if res is None:
                res = CustomerOrderSummary(id=row[0], name=row[1], first_order_date=row[2],
                                           last_order_date=row[3], total_orders_value=row[4])
            res.order_history.ticks.append(row[5])
            res.order_history.totals.append(row[6])
    finally:
        cursor.close()

    return res