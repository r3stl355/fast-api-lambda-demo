import React, { useState } from "react";

import OrdersSummary from "./OrdersSummary";
import Customer from "./Customer";

import classes from "./CustomerList.module.css";

const CustomerList = (props) => {
  const [state, setState] = useState({showOrdersSummary: false, customerId: -1});

  function getShowOrdersSummaryHandler(customerId) {
    return () => setState({showOrdersSummary: true, customerId: customerId});
  }

  const hideOrdersSummaryHandler = () => {
    setState({showOrdersSummary: false});
  };

  let content = <div className={classes.loader}><h2>Loading...</h2></div>;

  if (!props.loading) {
    content = <div>
                {state.showOrdersSummary && <OrdersSummary onClose={hideOrdersSummaryHandler} customerId={state.customerId} />}
                <ul className={classes["customer-list"]}>
                  {props.customers.map((customer) => (
                    <Customer key={customer.id} id={customer.id} name={customer.name} onShowCustomerDetails={getShowOrdersSummaryHandler(customer.id)}/>
                  ))}
                </ul>
              </div>;
  }
  return (
    content
  );
};

export default CustomerList;
