import React, { useState } from "react";
import styles from "./Tooltip.module.css";

const Tooltip = ({
  text,
  children,
  position = "!right-0 !top-[-35px]",
}: {
  text: string | React.ReactNode;
  children: React.ReactNode;
  position?: string;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={` ${styles.tooltipContainer}`}
      onClick={() => setVisible((prev) => !prev)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <div className={` ${position} ${styles.tooltip}`}>{text}</div>}
    </div>
  );
};

export default Tooltip;
