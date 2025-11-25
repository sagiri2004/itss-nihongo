import React from "react";
import {
  Box,
  TextField,
  Avatar,
  ListItemAvatar,
  ListItemText,
  InputAdornment,
  Typography,
  Divider,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";
import ClassIcon from "@mui/icons-material/Class";
import StyleIcon from "@mui/icons-material/Style";

const SearchComponent = ({
  searchQuery,
  setSearchQuery,
  searchData,
  handleSearchSelect,
}) => {
  const users = Array.isArray(searchData?.users) ? searchData.users : [];
  const classrooms = Array.isArray(searchData?.classrooms)
    ? searchData.classrooms
    : [];
  const flashcardSets = Array.isArray(searchData?.flashcardSets)
    ? searchData.flashcardSets
    : [];

  const combinedData = [
    { type: "User Divider" },
    ...users.map((user) => ({ ...user, type: "User" })),
    { type: "Classroom Divider" },
    ...classrooms.map((classroom) => ({ ...classroom, type: "Classroom" })),
    { type: "Flashcard Divider" },
    ...flashcardSets.map((flashcard) => ({ ...flashcard, type: "Flashcard" })),
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case "Classroom":
        return <ClassIcon color="secondary" />;
      case "Flashcard":
        return <StyleIcon color="action" />;
      default:
        return null;
    }
  };

  return (
    <Box p={2} width="50%">
      <Autocomplete
        fullWidth
        size="small"
        options={combinedData}
        isOptionEqualToValue={(option, value) =>
          option.type === value.type && option.id === value.id
        }
        getOptionLabel={(option) => option.name || option.title || ""}
        filterOptions={(options) =>
          options.filter((option) => !option.type.includes("Divider"))
        }
        onChange={(event, newValue) => {
          handleSearchSelect(newValue);
          setSearchQuery(newValue?.name || newValue?.title || "");
        }}
        inputValue={searchQuery}
        onInputChange={(event, newInputValue) => {
          setSearchQuery(newInputValue);
        }}
        noOptionsText="No data found"
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search users, classrooms, flashcards"
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          if (option.type.includes("Divider")) {
            return (
              <Divider
                key={option.type}
                textAlign="left"
                sx={{ marginY: 1, fontSize: "0.8rem", color: "gray" }}
              >
                {option.type.replace(" Divider", "")}
              </Divider>
            );
          }

          return (
            <li {...props} key={`${option.type}-${option.id}`}>
              <ListItemAvatar>
                {option.type === "User" ? (
                  <Avatar src={option.avatar} alt={option.name}>
                    {option.name?.[0] || "U"}
                  </Avatar>
                ) : (
                  getTypeIcon(option.type)
                )}
              </ListItemAvatar>
              <ListItemText
                primary={option.name || option.title}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {option.type}
                    {option.description ? ` - ${option.description}` : ""}
                  </Typography>
                }
              />
            </li>
          );
        }}
        ListboxProps={{
          sx: {
            maxHeight: 400,
            overflow: "auto",
            "&::-webkit-scrollbar": {
              width: "0px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "none",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: "none",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "none",
            },
          },
        }}
      />
    </Box>
  );
};

export default SearchComponent;
