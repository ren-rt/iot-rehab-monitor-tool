import { database } from './firebase';
import TherapyChecklist from "./components/TherapyChecklist";

function App() {
  return (
    <div style={styles.appContainer}>
      <TherapyChecklist />
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f0ede8",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    position: "relative",
    overflow: "hidden"
  }
};

export default App;