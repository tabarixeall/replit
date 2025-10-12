import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Phone, Users, TrendingUp, ArrowLeft, Trash2, User, Mail, Calendar, Copy } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import oxyp1Logo from "@/assets/oxyp1-logo.jpg";

interface WebhookResponse {
  id: number;
  phoneNumber: string;
  buttonPressed: string;
  bulkCallId: number | null;
  contactId: number | null;
  contactName: string | null;
  contactEmail: string | null;
  campaignName: string | null;
  userId: number | null;
  timestamp: string;
}

interface BulkCall {
  id: number;
  name: string;
  totalContacts: number;
  completedCalls: number;
  failedCalls: number;
  status: string;
  region: string;
  callFrom: string;
  createdAt: string;
  updatedAt: string;
}

export default function WebhookDashboard() {
  const { toast } = useToast();
  const { data: webhookResponses = [], isLoading: responsesLoading, refetch: refetchResponses } = useQuery<WebhookResponse[]>({
    queryKey: ["/api/webhook-responses"],
  });

  const { data: bulkCalls = [], isLoading: campaignsLoading } = useQuery<BulkCall[]>({
    queryKey: ["/api/bulk-calls"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (responseId: number) => {
      await apiRequest(`/api/webhook-responses/${responseId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-responses"] });
      toast({
        title: "Success",
        description: "Response data deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete response data",
        variant: "destructive",
      });
    },
  });

  const copyContactData = (response: WebhookResponse) => {
    // Format: contactdetails|email|number or contactdetails|number if no email
    const contactDetails = response.contactName || "No Name";
    const email = response.contactEmail;
    const copyText = email 
      ? `${contactDetails}|${email}|${response.phoneNumber}`
      : `${contactDetails}|${response.phoneNumber}`;
    
    navigator.clipboard.writeText(copyText).then(() => {
      toast({
        title: "Copied!",
        description: `Contact data copied: ${copyText}`,
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    });
  };

  // Calculate statistics
  const totalResponses = webhookResponses.length;
  const uniquePhoneNumbers = new Set(webhookResponses.map(r => r.phoneNumber)).size;
  const responsesToday = webhookResponses.filter(r => {
    const responseDate = new Date(r.timestamp);
    const today = new Date();
    return responseDate.toDateString() === today.toDateString();
  }).length;

  // Group responses by campaign
  const responsesByCampaign = webhookResponses.reduce((acc, response) => {
    if (response.bulkCallId) {
      const campaign = bulkCalls.find(c => c.id === response.bulkCallId);
      const campaignName = campaign?.name || `Campaign ${response.bulkCallId}`;
      acc[campaignName] = (acc[campaignName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Recent responses (last 10)
  const recentResponses = webhookResponses.slice(0, 10);

  if (responsesLoading || campaignsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading webhook dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header with back button and logo */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Calls
                </Button>
              </Link>
              <img 
                src={oxyp1Logo} 
                alt="OXYP1 Logo" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <h1 className="text-xl font-semibold text-slate-800">OXYP1 - Pressed 1 Data</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchResponses()}
              disabled={responsesLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${responsesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-6">
        {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses}</div>
            <p className="text-xs text-muted-foreground">
              Button presses recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Callers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniquePhoneNumbers}</div>
            <p className="text-xs text-muted-foreground">
              Different phone numbers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Responses</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responsesToday}</div>
            <p className="text-xs text-muted-foreground">
              Responses in the last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Response Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Responses by Campaign</CardTitle>
            <CardDescription>
              Number of button presses per campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(responsesByCampaign).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(responsesByCampaign)
                  .sort(([,a], [,b]) => b - a)
                  .map(([campaign, count]) => (
                  <div key={campaign} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {campaign}
                      </span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No campaign responses yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Responses */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Button Presses</CardTitle>
            <CardDescription>
              Latest webhook responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentResponses.length > 0 ? (
              <div className="space-y-3">
                {recentResponses.map((response) => {
                  const campaign = bulkCalls.find(c => c.id === response.bulkCallId);
                  return (
                    <div key={response.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{response.phoneNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            Button {response.buttonPressed}
                          </Badge>
                        </div>
                        {campaign && (
                          <span className="text-xs text-muted-foreground">
                            From: {campaign.name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(response.timestamp), "MMM d, HH:mm")}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No responses recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        {/* Enhanced Responses Table with Contact Details */}
        {webhookResponses.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>All Pressed 1 Data</CardTitle>
              <CardDescription>
                Complete history of button press responses with contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Contact Details</th>
                      <th className="text-left p-2">Phone Number</th>
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookResponses.map((response) => (
                      <tr key={response.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="flex flex-col gap-1">
                            {response.contactName && (
                              <div className="flex items-center gap-1 text-xs">
                                <User className="w-3 h-3" />
                                <span className="font-medium">{response.contactName}</span>
                              </div>
                            )}
                            {response.contactEmail && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                <span>{response.contactEmail}</span>
                              </div>
                            )}
                            {!response.contactName && !response.contactEmail && (
                              <span className="text-xs text-muted-foreground">No contact info</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span className="font-mono text-xs">{response.phoneNumber}</span>
                            <Badge variant="outline" className="text-xs">
                              Pressed {response.buttonPressed}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs font-medium">
                            {response.campaignName || "Unknown Campaign"}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(response.timestamp), "MMM d, yyyy HH:mm")}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {response.buttonPressed === "1" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyContactData(response)}
                                className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                title="Copy contact details and number"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(response.id)}
                              disabled={deleteMutation.isPending}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete response"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}