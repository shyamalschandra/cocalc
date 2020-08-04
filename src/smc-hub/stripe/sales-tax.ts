/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Compute sales tax for a given customer in WA state.
*/

const { sales_tax } = require("smc-util-node/misc_node");
const { get_stripe } = require("./connect");

export async function stripe_sales_tax(
  customer_id: string,
  dbg: Function
): Promise<number> {
  const stripe = get_stripe();
  if (stripe == null) {
    dbg("not initialized");
    throw Error("stripe not initialized -- please try again");
  }
  const customer = await stripe.customers.retrieve(customer_id);
  if (customer.default_source == null) {
    dbg("no default source");
    return 0;
  }
  let zip = undefined;
  for (const x of customer.sources.data) {
    if (x.id == customer.default_source) {
      zip = x.address_zip?.slice(0, 5);
      break;
    }
  }
  if (zip == null) {
    return 0;
  }
  const tax = sales_tax(zip);
  dbg("tax: ", tax);
  return tax;
}
