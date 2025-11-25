import { Box } from "@mui/material";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

function Default({ children }) {
  return (
    <Box
      bgcolor={"bg-main"}
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
      }}
    >
      <Header />
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          flexGrow: 1,
          width: "100%",
          height: (theme) => theme.custom.mainContentHeight,
          mt: (theme) => theme.custom.headerHeight,
        }}
      >
        <Sidebar />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            // overflow: "auto",
            //css scroll bar
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#6a5af9",
              borderRadius: "50px",
              backgroundImage: "linear-gradient(-45deg, #6a5af9, #d66efd)",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "white",
            },
            // if scrollBar is true, show scroll bar
            // overflow: scrollBar ? "auto" : "hidden",
          }}
        >
          <Box>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}

export default Default;
