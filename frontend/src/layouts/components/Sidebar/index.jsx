import DashboardIcon from "@mui/icons-material/Dashboard";
import MessageIcon from "@mui/icons-material/Message";
import ClassIcon from "@mui/icons-material/Class";
import StyleIcon from "@mui/icons-material/Style";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  Collapse,
} from "@mui/material";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import routes from "~/config/routes";
import apiClient from "~/api/apiClient";

// Define the navigation structure
const NAVIGATION = [
  {
    segment: "dashboard",
    title: "Dashboard",
    icon: <DashboardIcon />,
    route: routes.home,
  },
  {
    segment: "classroom",
    title: "Classrooms",
    icon: <ClassIcon />,
    route: routes.classrooms,
  },
  {
    segment: "flashcards",
    title: "Flashcards",
    icon: <StyleIcon />,
    route: routes.myFlashcardSets,
  },
  {
    segment: "messages",
    title: "Messages",
    icon: <MessageIcon />,
    route: routes.messenger,
  },
];

function Sidebar() {
  const [openSegments, setOpenSegments] = useState({});
  const [isSelected, setIsSelected] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Handle the toggle of a segment (open/close) or navigate if no children
  const handleOpen = async (nav) => {
    if (nav?.children && nav.children.length > 0) {
      setOpenSegments((prevOpenSegments) => ({
        ...prevOpenSegments,
        [nav.segment]: !prevOpenSegments[nav.segment],
      }));

      if (isSelected === nav.segment) {
        setIsSelected("");
      } else {
        // setIsSelected(nav.segment);
        // neu la message thi goi api de lay danh sach conversation va id bat dau la id cua conversation dau tien
        if (nav.segment === "messages") {
          // call api
          const { data } = await apiClient.get("/messages");
          const conversationId = data[0].id;
          console.log("conversationId", conversationId);
          // navigate(`/messages/${conversationId}`);
        } else {
          navigate(nav.route);
        }
      }
    } else {
      setIsSelected(nav.segment);
      navigate(nav.route);
    }
  };

  return (
    <List
      sx={{
        borderRight: "1px solid",
        borderColor: "primary.dark",
        width: "64px",
      }}
    >
      {NAVIGATION.map((nav) => {
        const isActive =
          nav.route === "/"
            ? location.pathname === nav.route // Ensure "/" is active only when exactly at "/"
            : location.pathname.startsWith(nav.route); // Match other routes as before

        return (
          <Box key={nav.segment}>
            <ListItemButton
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                height: "64px",
                // backgroundColor: isActive ? "primary.light" : "inherit", // Highlight active item
                // "&:hover": {
                //   backgroundColor: isActive
                //     ? "primary.light"
                //     : "primary.lighter", // Hover effect
                // },
              }}
              selected={isSelected === nav.segment} // Mark as selected
              onClick={() => handleOpen(nav)} // Handle item click
            >
              <ListItemIcon
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isActive ? "primary.main" : "text.primary", // Change icon color based on active state
                }}
              >
                {nav.icon}
              </ListItemIcon>
            </ListItemButton>

            {/* Render collapse for items with children */}
            {nav.children && (
              <Collapse
                in={openSegments[nav.segment]} // Control the collapse state
                timeout="auto"
                unmountOnExit
              >
                <List component="div" disablePadding>
                  {nav.children.map((child) => (
                    <ListItemButton
                      key={child.segment}
                      sx={{
                        borderLeft: "1px solid",
                        borderColor: "primary.dark",
                      }}
                      onClick={() => navigate(`/${child.segment}`)} // Navigate to child route
                    >
                      <ListItemIcon>{child.icon}</ListItemIcon>
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        );
      })}
    </List>
  );
}

export default Sidebar;
