import React, { useState } from "react";
import styles from "./Tooltip.module.css";

const Tooltip = ({
  text,
  children,
}: {
  text: string | React.ReactNode;
  children: any;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={styles.tooltipContainer}
      onClick={() => setVisible((prev) => !prev)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <div className={styles.tooltip}>{text}</div>}
    </div>
  );
};

export default Tooltip;
