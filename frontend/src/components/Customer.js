import React, { Component } from 'react';

import classes from './Customer.module.css';

const Customer = (props) => {

  return (
    <li className={classes.customer}>
      <h2>{props.name}</h2>
      
      <div className={classes.actions}>
        <button className={classes['button--alt']} onClick={props.onShowCustomerDetails}>Show Orders Summary</button>
      </div>
    </li>
  );
};

export default Customer;
