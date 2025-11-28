// =====================================================================
// SFV Tech – Engineer Messages Page
// =====================================================================
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Badge,
  IconButton,
  Divider,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import {
  MailOutline,
  Mail,
  Delete,
  Visibility,
  MarkEmailRead,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import api from "../../utils/api";

export default function MessagesPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  // === Load messages ===
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get("/api/engineer/messages");
        setMessages(res.data);
      } catch (error) {
        enqueueSnackbar("Failed to load messages", { variant: "error" });
      }
    };
    fetchMessages();
  }, [enqueueSnackbar]);

  // === Handle View Message ===
  const handleOpenMessage = (msg) => {
    setSelectedMessage(msg);
    setOpenDialog(true);

    // mark as read instantly
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, unread: false } : m))
    );
  };

  const handleCloseDialog = () => {
    setSelectedMessage(null);
    setOpenDialog(false);
  };

  // === Handle Delete ===
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/engineer/messages/${id}`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      enqueueSnackbar("Message deleted", { variant: "info" });
    } catch {
      enqueueSnackbar("Failed to delete message", { variant: "error" });
    }
  };

  return (
    <Box sx={{ p: 4, background: "#001f3f", color: "#fff", minHeight: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          💬 Messages
        </Typography>
        <Chip
          label={`${messages.filter((m) => m.unread).length} Unread`}
          color="warning"
          icon={<MailOutline />}
          sx={{ fontWeight: 600, color: "#0b1a33" }}
        />
      </Box>

      <Divider sx={{ bgcolor: "#123", mb: 3 }} />

      {/* Messages List */}
      {messages.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 4, opacity: 0.8 }}>
          No messages available.
        </Typography>
      ) : (
        messages.map((msg) => (
          <Card
            key={msg.id}
            sx={{
              backgroundColor: msg.unread ? "#012a4a" : "#0b1a33",
              color: "#fff",
              borderLeft: msg.unread ? "4px solid #f5c400" : "4px solid transparent",
              borderRadius: 3,
              mb: 2,
              boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
            }}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Badge
                  color="error"
                  variant={msg.unread ? "dot" : "standard"}
                  overlap="circular"
                >
                  <Avatar sx={{ bgcolor: "#f5c400", color: "#0b1a33", fontWeight: 600 }}>
                    {msg.sender[0].toUpperCase()}
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {msg.sender}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {msg.subject}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Tooltip title="View Message">
                  <IconButton sx={{ color: "#f5c400" }} onClick={() => handleOpenMessage(msg)}>
                    <Visibility />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete Message">
                  <IconButton sx={{ color: "error.main" }} onClick={() => handleDelete(msg.id)}>
                    <Delete />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      {/* === Dialog to read message === */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "#0b1a33", fontWeight: 700 }}>
          <MarkEmailRead sx={{ verticalAlign: "middle", mr: 1 }} />
          {selectedMessage?.subject || "Message"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            From: {selectedMessage?.sender}
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {selectedMessage?.body}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
