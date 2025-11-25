import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  Avatar,
  Box,
} from "@mui/material";
import apiClient from "~/api/apiClient"; // Đảm bảo bạn có file apiClient.js để gọi API
import { useNavigate } from "react-router-dom";

function ClassroomDialog({ open, classroom, onClose }) {
  const navigate = useNavigate();

  const onJoin = async () => {
    try {
      const response = await apiClient.post("/classroom/join", {
        classroomId: classroom.id,
      });

      navigate(`/classroom/${classroom.id}`);
      // đóng dialog
      onClose();
    } catch (error) {
      console.error("Error joining classroom:", error);
    }
  };

  if (!classroom) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Classroom Details</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
          <Avatar
            alt={classroom.name}
            src={classroom.imageUrl}
            sx={{ width: 100, height: 100, marginBottom: 2 }}
          />
          <Typography variant="h6">{classroom.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            {classroom.description}
          </Typography>
          <Typography variant="body2" color="textSecondary" mt={1}>
            Created At: {new Date(classroom.createdAt).toLocaleDateString()}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Last Updated: {new Date(classroom.updatedAt).toLocaleDateString()}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
        <Button onClick={onJoin} color="primary">
          Join Classroom
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ClassroomDialog;
