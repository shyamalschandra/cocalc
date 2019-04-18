import * as React from "react";
import { MentionFilter } from "./types";
const { Nav, NavItem } = require("react-bootstrap");

export function NotificationNav({
  filter,
  on_click,
  style
}: {
  filter: MentionFilter;
  on_click: (label: MentionFilter) => void;
  style: React.CSSProperties;
}) {
  return (
    <Nav
      bsStyle="pills"
      activeKey={filter}
      onSelect={on_click}
      stacked={true}
      style={style}
    >
      <NavItem eventKey={"unread"}>Unread</NavItem>
      <NavItem eventKey={"read"}>Read</NavItem>
      <NavItem eventKey={"saved"}>Saved for later</NavItem>
      <NavItem eventKey={"all"}>All mentions</NavItem>
    </Nav>
  );
}
