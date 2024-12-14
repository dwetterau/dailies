import styles from "./Loading.module.css"

export function Loading() {
  return (
    <div className={styles.loadingLayout}>
      <div className={styles.loading} />
    </div>
  );
}