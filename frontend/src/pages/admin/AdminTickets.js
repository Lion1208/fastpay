import { useState, useEffect } from "react";
import { Layout } from "../../components/Layout";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API}/tickets`);
      setTickets(response.data.tickets);
    } catch (error) {
      toast.error("Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      const response = await axios.post(`${API}/tickets/${selectedTicket.id}/reply`, {
        mensagem: replyMessage
      });
      setSelectedTicket(response.data);
      setTickets(tickets.map(t => t.id === response.data.id ? response.data : t));
      setReplyMessage("");
      toast.success("Resposta enviada!");
    } catch (error) {
      toast.error("Erro ao enviar resposta");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await axios.put(`${API}/tickets/${ticketId}/status?status=${newStatus}`);
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
      toast.success("Status atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return <Badge className="badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> Aberto</Badge>;
      case "in_progress":
        return <Badge className="badge-info flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Em Andamento</Badge>;
      case "resolved":
        return <Badge className="badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolvido</Badge>;
      case "closed":
        return <Badge className="badge-error flex items-center gap-1"><XCircle className="w-3 h-3" /> Fechado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openTicketsCount = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-tickets">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tickets de Suporte</h1>
            <p className="text-slate-400">Responda aos tickets dos usuários</p>
          </div>
          {openTicketsCount > 0 && (
            <Badge className="badge-warning text-lg px-4 py-2">
              {openTicketsCount} aberto{openTicketsCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <Card className="card-dashboard lg:col-span-1 max-h-[700px] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Tickets</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="spinner w-8 h-8"></div>
                </div>
              ) : tickets.length > 0 ? (
                <div className="divide-y divide-slate-800">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full p-4 text-left transition-colors hover:bg-slate-800/50 ${
                        selectedTicket?.id === ticket.id ? 'bg-slate-800/50 border-l-2 border-green-500' : ''
                      }`}
                      data-testid={`ticket-${ticket.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="font-medium text-white truncate">{ticket.assunto}</p>
                      <p className="text-sm text-slate-500">{ticket.parceiro_nome}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum ticket</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Detail */}
          <Card className="card-dashboard lg:col-span-2">
            {selectedTicket ? (
              <>
                <CardHeader className="border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-white">{selectedTicket.assunto}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        De: {selectedTicket.parceiro_nome}
                      </p>
                    </div>
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                    >
                      <SelectTrigger className="w-40 input-default">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Messages */}
                  <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                    {selectedTicket.mensagens?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.autor_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.autor_role === 'admin' 
                            ? 'bg-green-500/20 text-green-100 border border-green-500/30' 
                            : 'bg-slate-800 text-white'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {msg.autor_role === 'admin' ? 'Você (Admin)' : msg.autor_nome}
                            </span>
                            <span className="text-xs opacity-60">
                              {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.mensagem}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input */}
                  {selectedTicket.status !== 'closed' && (
                    <div className="p-4 border-t border-slate-800">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Digite sua resposta..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                          className="input-default"
                          data-testid="admin-reply-input"
                        />
                        <Button
                          onClick={handleReply}
                          disabled={sending || !replyMessage.trim()}
                          className="btn-primary"
                          data-testid="admin-send-reply-btn"
                        >
                          {sending ? <div className="spinner w-4 h-4" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">Selecione um ticket para responder</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
