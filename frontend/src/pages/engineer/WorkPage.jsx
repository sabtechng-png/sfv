// =====================================================================
// SFV Tech – Work Management Page (Engineer Portal)
// =====================================================================
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  Chip,
} from "@mui/material";
import {
  AddCircle,
  Edit,
  Delete,
  AssignmentTurnedIn,
  PendingActions,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import api from "../../utils/api";

export default function WorkPage() {
  const { enqueueSnackbar } = useSnackbar();

  // === State ===
  const [tasks, setTasks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(false);

  // === Fetch Tasks ===
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get("/api/engineer/tasks");
        setTasks(res.data || []);
      } catch (error) {
        enqueueSnackbar("Failed to load work tasks", { variant: "error" });
      }
    };
    fetchTasks();
  }, [enqueueSnackbar]);

  // === Handlers ===
  const handleOpen = () => setOpenDialog(true);
  const handleClose = () => {
    setOpenDialog(false);
    setNewTask({ title: "", description: "" });
  };

  const handleAddTask = async () => {
    if (!newTask.title) {
      enqueueSnackbar("Please enter a task title", { variant: "warning" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/api/engineer/tasks", newTask);
      setTasks((prev) => [...prev, res.data]);
      enqueueSnackbar("New task added successfully", { variant: "success" });
      handleClose();
    } catch (error) {
      enqueueSnackbar("Failed to add new task", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/engineer/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      enqueueSnackbar("Task deleted", { variant: "info" });
    } catch {
      enqueueSnackbar("Failed to delete task", { variant: "error" });
    }
  };

  // === UI ===
  return (
    <Box sx={{ p: 4, background: "#001f3f", color: "#fff", minHeight: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          🧰 Work Management
        </Typography>
        <Button
          startIcon={<AddCircle />}
          variant="contained"
          sx={{ backgroundColor: "#f5c400", color: "#0b1a33", fontWeight: 600 }}
          onClick={handleOpen}
        >
          Add Task
        </Button>
      </Box>

      <Divider sx={{ bgcolor: "#123" }} />

      {/* Task Grid */}
      <Grid container spacing={3} mt={1}>
        {tasks.length === 0 ? (
          <Typography variant="body1" sx={{ mt: 4, opacity: 0.8, ml: 2 }}>
            No work tasks found. Click <b>Add Task</b> to create one.
          </Typography>
        ) : (
          tasks.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <Card
                sx={{
                  backgroundColor: "#012a4a",
                  color: "#fff",
                  borderRadius: 3,
                  boxShadow: "0px 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    {task.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, mb: 2, opacity: 0.85 }}
                  >
                    {task.description}
                  </Typography>

                  <Chip
                    icon={
                      task.status === "completed" ? (
                        <AssignmentTurnedIn sx={{ color: "#0b1a33" }} />
                      ) : (
                        <PendingActions sx={{ color: "#0b1a33" }} />
                      )
                    }
                    label={
                      task.status === "completed" ? "Completed" : "In Progress"
                    }
                    sx={{
                      backgroundColor: "#f5c400",
                      color: "#0b1a33",
                      fontWeight: 600,
                    }}
                  />
                </CardContent>

                <CardActions>
                  <Tooltip title="Edit Task">
                    <IconButton
                      sx={{ color: "#f5c400" }}
                      onClick={() => enqueueSnackbar("Edit feature coming soon", { variant: "info" })}
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete Task">
                    <IconButton
                      sx={{ color: "error.main" }}
                      onClick={() => handleDelete(task.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* === Add Task Dialog === */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#0b1a33" }}>
          ➕ Add New Task
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            value={newTask.title}
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <TextField
            margin="dense"
            label="Task Description"
            fullWidth
            multiline
            rows={3}
            value={newTask.description}
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ backgroundColor: "#f5c400", color: "#0b1a33", fontWeight: 600 }}
            onClick={handleAddTask}
            disabled={loading}
          >
            {loading ? "Saving..." : "Add Task"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
