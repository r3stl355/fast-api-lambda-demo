import { NavLink } from 'react-router-dom';

import classes from './Header.module.css';

const Header = () => {

  return (
    <header className={classes.header}>
      <nav>
        <ul>
          <li>
            <NavLink activeClassName={classes.active} to='/index.html'>
              Home
            </NavLink>
          </li>
          <li style={{textAlign: 'right'}}>
            <NavLink activeClassName={classes.active} to='/top_customers'>
              Show Top Customers
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
