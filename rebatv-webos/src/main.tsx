import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-500.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import "@fontsource/bricolage-grotesque/latin-500.css";
import "@fontsource/bricolage-grotesque/latin-700.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "./styles/app.css";
import { render } from "preact";
import { App } from "./App";
import { installPointerFocus } from "./nav";

installPointerFocus();
render(<App />, document.getElementById("app")!);
