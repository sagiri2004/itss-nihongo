import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  ListItemIcon,
} from "@mui/material";
import ClassIcon from "@mui/icons-material/Class";
import StyleIcon from "@mui/icons-material/Style";
import apiClient from "~/api/apiClient";

function UserDialog({ open, user, onClose }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (user) {
      apiClient.get(`/user/${user.id}`).then((response) => {
        setUserData(response.data.data);
      });
    }
  }, [user]);

  if (!user || !userData) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>User Details</DialogTitle>
      <DialogContent>
        <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
          <Avatar
            alt={user.name}
            src={user.avatar}
            sx={{ width: 100, height: 100 }}
          />
        </Box>
        <Typography variant="h6">{user.name}</Typography>
        <Typography variant="body2" color="textSecondary">
          @{user.username}
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Email: {user.email}
        </Typography>

        {/* User's Classrooms */}
        <Divider sx={{ marginY: 2 }} />
        <Typography variant="h6" gutterBottom>
          Classrooms:
        </Typography>
        <List>
          {userData.classrooms.map((classroom) => (
            <ListItem key={classroom.classroomId}>
              <ListItemIcon>
                <ClassIcon />
              </ListItemIcon>
              <ListItemText
                primary={classroom.Classroom.name}
                secondary={`Description: ${classroom.Classroom.description}`}
              />
            </ListItem>
          ))}
        </List>

        {/* User's Flashcard Sets */}
        <Divider sx={{ marginY: 2 }} />
        <Typography variant="h6" gutterBottom>
          Flashcard Sets:
        </Typography>
        <List>
          {userData.flashcardSets.map((flashcardSet) => (
            <ListItem key={flashcardSet.flashcardSetId}>
              <ListItemIcon>
                <StyleIcon />
              </ListItemIcon>
              <ListItemText
                primary={flashcardSet.flashcardSet.title}
                secondary={`Description: ${flashcardSet.flashcardSet.description}`}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UserDialog;
