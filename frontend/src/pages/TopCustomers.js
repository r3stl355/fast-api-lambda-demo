import { Route } from 'react-router-dom';
import React, {useEffect, useState} from 'react';

import CustomerList from '../components/CustomerList';

const TopCustomers = () => {
  const [data, setData] = useState({customers: [], isLoading: true});

  useEffect(() => {
    const getTopCustomers = () => {
      let headers = new Headers({'Authorization': 'Bearer ' + process.env.REACT_APP_API_TOKEN});
      fetch(
        process.env.REACT_APP_API_URL + '/top_customers', 
        {
          headers: headers
        }
      )
      .then((response) => {
        return response.json();
      })
      .then((res) => {
        setData({customers: res, isLoading: false});
      }); 
    };
    getTopCustomers();
  }, []);

  return <CustomerList customers={data.customers} loading={data.isLoading}/>
};

export default TopCustomers;