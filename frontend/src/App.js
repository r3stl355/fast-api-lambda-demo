import { Route, Switch, Redirect } from 'react-router-dom';

import Customer from './pages/Customer';
import TopCustomers from './pages/TopCustomers';
import Header from './components/Header';

import './App.css';

import architecture from './architecture.png'

function App() {
  return (
    <div>
      <Header />
      <main>
        <Switch>
          <Route path='/' exact>
            <section>
              <img src={architecture}/>
            </section>
          </Route>
          <Route path='/index.html'>
            <section>
              <img src={process.env.REACT_APP_DIAGRAM_URL}/>
            </section>
          </Route>
          <Route path='/top_customers'>
            <TopCustomers />
          </Route>
          <Route path='/customer/:customerId'>
            <Customer />
          </Route>
        </Switch>
      </main>
    </div>
  );
}

export default App;
