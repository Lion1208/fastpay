import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { MessageSquare, Plus, Send, Clock, CheckCircle, AlertCircle } from "lucide-react";


export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [newTicket, setNewTicket] = useState({
    assunto: "",
    mensagem: "",
    prioridade: "normal"
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get(`/tickets`);
      setTickets(response.data.tickets);
    } catch (error) {
      toast.error("Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTicket.assunto || !newTicket.mensagem) {
      toast.error("Preencha todos os campos");
      return;
    }

    setCreating(true);
    try {
      const response = await api.post(`/tickets`, newTicket);
      setTickets([response.data, ...tickets]);
      setNewTicket({ assunto: "", mensagem: "", prioridade: "normal" });
      setShowNewDialog(false);
      toast.success("Ticket criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar ticket");
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      const response = await api.post(`/tickets/${selectedTicket.id}/reply`, {
        mensagem: replyMessage
      });
      setSelectedTicket(response.data);
      setTickets(tickets.map(t => t.id === response.data.id ? response.data : t));
      setReplyMessage("");
      toast.success("Mensagem enviada!");
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
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
        return <Badge className="badge-error">Fechado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <Badge className="badge-error">Alta</Badge>;
      case "normal":
        return <Badge className="badge-info">Normal</Badge>;
      case "low":
        return <Badge className="badge-success">Baixa</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="tickets-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Suporte</h1>
            <p className="text-slate-400">Abra tickets e converse com nossa equipe</p>
          </div>
          
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="new-ticket-btn">
                <Plus className="mr-2 h-4 w-4" />
                Novo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Abrir Novo Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Assunto</Label>
                  <Input
                    type="text"
                    placeholder="Descreva brevemente o problema"
                    value={newTicket.assunto}
                    onChange={(e) => setNewTicket({ ...newTicket, assunto: e.target.value })}
                    className="input-default"
                    data-testid="ticket-assunto"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Prioridade</Label>
                  <Select
                    value={newTicket.prioridade}
                    onValueChange={(value) => setNewTicket({ ...newTicket, prioridade: value })}
                  >
                    <SelectTrigger className="input-default">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Mensagem</Label>
                  <Textarea
                    placeholder="Descreva seu problema em detalhes..."
                    value={newTicket.mensagem}
                    onChange={(e) => setNewTicket({ ...newTicket, mensagem: e.target.value })}
                    className="input-default min-h-[120px]"
                    data-testid="ticket-mensagem"
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full btn-primary"
                  data-testid="create-ticket-btn"
                >
                  {creating ? <div className="spinner w-5 h-5" /> : "Criar Ticket"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <Card className="card-dashboard lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg text-white">Seus Tickets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                        {getPriorityBadge(ticket.prioridade)}
                      </div>
                      <p className="font-medium text-white truncate">{ticket.assunto}</p>
                      <p className="text-xs text-slate-500 mt-1">
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
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(selectedTicket.status)}
                        {getPriorityBadge(selectedTicket.prioridade)}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(selectedTicket.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Messages */}
                  <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                    {selectedTicket.mensagens?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.autor_role === 'admin' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.autor_role === 'admin' 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-green-500/20 text-green-100 border border-green-500/30'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {msg.autor_role === 'admin' ? 'Suporte' : msg.autor_nome}
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
                          placeholder="Digite sua mensagem..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                          className="input-default"
                          data-testid="reply-input"
                        />
                        <Button
                          onClick={handleReply}
                          disabled={sending || !replyMessage.trim()}
                          className="btn-primary"
                          data-testid="send-reply-btn"
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
                  <p className="text-slate-500">Selecione um ticket para ver os detalhes</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
