import styles from "./Content.module.css";

function Content({ selectedPath }) {
  return (
    <div className={styles.wrapper}>
      <p>{selectedPath || "No file/folder selected"}</p>
    </div>
  );
}

export default Content;
