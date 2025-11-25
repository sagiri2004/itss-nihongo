import * as React from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { Experimental_CssVarsProvider as CssVarsProvider } from "@mui/material/styles";
import store, { persistor } from "~/redux/store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App";
import theme from "./theme";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

const GOOGLE_CLIENT_ID =
  "401336515446-7243voavrlot5rqr2c4d4ns7cb6mtlrk.apps.googleusercontent.com";

root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <React.StrictMode>
        <CssVarsProvider theme={theme}>
          <CssBaseline />
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <App />
          </GoogleOAuthProvider>
        </CssVarsProvider>
      </React.StrictMode>
    </PersistGate>
  </Provider>
);
