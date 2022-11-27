import React, {useEffect, useState} from 'react';

import Modal from './Modal';

import classes from './OrdersSummary.module.css';

import CanvasJSReact from '../assets/canvasjs.react';
var CanvasJS = CanvasJSReact.CanvasJS;
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

const OrdersSummary = (props) => {

  const [data, setData] = useState({orderSummary: null, loaded: false})

  const buildChart = (orderHistory) => {
    let dataPoints = [];
    let prevDate = null;
    for (let i = 0; i < orderHistory.ticks.length; i++) {
      let tick = orderHistory.ticks[i];
      let date = new Date(tick + '-01');
      if (prevDate !== null) {
        prevDate.setMonth(prevDate.getMonth() + 1); 
        while (prevDate < date) {
          dataPoints.push({y: 0, label: prevDate.toISOString().substring(0, 7)});  
          prevDate.setMonth(prevDate.getMonth() + 1);
        }
      }
      prevDate = date;
      dataPoints.push({y: orderHistory.totals[i], label: tick});
    }
    const options = {
      animationEnabled: true,
      theme: "light2",
      title:{
        text: "Monthly Order History"
      },
      axisX: {
        title: "Period",
        reversed: false,
      },
      axisY: {
        title: "Total",
        includeZero: false,
      },
      data: [{
        color: "blue",
        type: "column",
        ype: "bar",
        dataPoints: dataPoints
      }]
    };
    return options
  };

  const customerId = props.customerId;

  useEffect(() => {
    const getOrdersSummary = () => {
      let headers = new Headers({'Authorization': 'Bearer ' + process.env.REACT_APP_API_TOKEN});
      let url = process.env.REACT_APP_API_URL + '/customer/' + props.customerId + "/order_summary";
      console.log(url);
      fetch(
        url, 
        {
          headers: headers
        }
      )
      .then((response) => {
        return response.json();
      })
      .then((res) => {
        let orderSummary = {
          options: buildChart(res.order_history),
          customerName: res.name,
          firstOrder: new Date(res.first_order_date),
          lastOrder: new Date(res.last_order_date),
          totalOrdersValue: res.total_orders_value
        }
        setData({orderSummary: orderSummary, loaded: true});
      }); 
    };
    getOrdersSummary();
  }, []);

  let content = <div className={classes.loader}><h2>Loading...</h2></div>;

  if (data.loaded) {
    content =
      <div>
        <div className={classes.title}>
          <span>Name:</span>
          <span className={classes.value}>{data.orderSummary.customerName}</span>
        </div>
        <div className={classes.title}>
          <span>First order placed on:</span>
          <span className={classes.value}>{data.orderSummary.firstOrder.toLocaleDateString("en-GB")}</span>
        </div>
        <div className={classes.title}>
          <span>Last order date:</span>
          <span className={classes.value}>{data.orderSummary.lastOrder.toLocaleDateString("en-GB")}</span>
        </div>
        <div className={classes.title}>
          <span>Total all orders value:</span>
          <span className={classes.value}>${data.orderSummary.totalOrdersValue.toLocaleString("en-GB")}</span>
        </div>
        <div className={classes.actions}>
          <button className={classes['button--alt']} onClick={props.onClose}>
            Close
          </button>
        </div>
        <div><CanvasJSChart options = {data.orderSummary.options}/></div>
      </div>
  }
  return (
    <Modal onClose={props.onClose}>
      {content}
    </Modal>
  );
};

export default OrdersSummary;
