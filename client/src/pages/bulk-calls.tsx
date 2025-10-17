import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Users, Upload, Play, ArrowLeft, Phone, CheckCircle, XCircle, Clock, Loader2, RefreshCw, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { bulkCallSchema, type BulkCallRequest, type BulkCall } from "@shared/schema.js";
import oxyp1Logo from "@/assets/oxyp1-logo.jpg";

export default function BulkCallsPage() {
  const { toast } = useToast();

  const form = useForm<BulkCallRequest>({
    resolver: zodResolver(bulkCallSchema),
    defaultValues: {
      name: "",
      callFrom: "",
      region: "US-EAST",
      contacts: "",
    }
  });

  // Fetch bulk call campaigns with automatic refresh for in-progress campaigns
  const { data: bulkCalls = [], isLoading: bulkCallsLoading, refetch } = useQuery<BulkCall[]>({
    queryKey: ['/api/bulk-calls'],
    refetchInterval: 3000, // Refresh every 3 seconds for now
    refetchIntervalInBackground: true,
  });

  // Fetch user credits
  const { data: creditsData } = useQuery<{ success: boolean; credits: number }>({
    queryKey: ['/api/credits'],
  });

  // Fetch campaign status
  const { data: campaignStatus } = useQuery<{ success: boolean; status: any }>({
    queryKey: ['/api/campaign-status'],
  });

  // Create bulk call campaign mutation
  const createBulkCallMutation = useMutation({
    mutationFn: async (data: BulkCallRequest) => {
      const response = await apiRequest('POST', '/api/bulk-calls', data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Campaign Created",
        description: result.message,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || 'Failed to create bulk call campaign',
        variant: "destructive"
      });
    }
  });

  // Start bulk call mutation
  const startBulkCallMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/bulk-calls/${id}/start`);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Campaign Started",
        description: result.message,
      });
      // Force immediate refresh and continue polling
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      
      // Set up polling every 2 seconds for the next 60 seconds to catch updates
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/bulk-calls'] });
      }, 2000);
      
      setTimeout(() => clearInterval(pollInterval), 60000);
    },
    onError: (error: any) => {
      toast({
        title: "Start Failed",
        description: error.message || 'Failed to start bulk call campaign',
        variant: "destructive"
      });
    }
  });

  // Cancel bulk call mutation
  const cancelBulkCallMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/bulk-calls/${id}/cancel`);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Campaign Cancelled",
        description: result.message,
      });
      // Force immediate refresh
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaign-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancel Failed",
        description: error.message || 'Failed to cancel bulk call campaign',
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: BulkCallRequest) => {
    createBulkCallMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'in-progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'secondary',
      'in-progress': 'default',
      'completed': 'secondary',
      'cancelled': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Calls
                </Button>
              </Link>
              <img 
                src={oxyp1Logo} 
                alt="OXYP1 Logo" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <h1 className="text-xl font-semibold text-slate-800">OXYP1 - Bulk Campaigns</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Credits Display */}
        <Card className="mb-6 shadow-sm border border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Available Credits</h3>
                  <p className="text-2xl font-bold text-green-600">{creditsData?.credits || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Each call costs 1 credit</p>
                {campaignStatus?.status?.status === 'running' && (
                  <p className="text-xs text-amber-600 font-medium mt-1">Campaign in progress</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Create Campaign Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Create Bulk Call Campaign</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Marketing Campaign Q1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="callFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call From Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="e.g., +1 (555) 123-4567"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="US-EAST">US East</SelectItem>
                                <SelectItem value="US-WEST">US West</SelectItem>
                                <SelectItem value="EU-CENTRAL">EU Central</SelectItem>
                                <SelectItem value="ASIA-PACIFIC">Asia Pacific</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contacts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Data</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-[200px] font-mono text-sm"
                              placeholder={`Paste contact data here:

Format 1 - Email|Name|Phone:
john@example.com|John Doe|555-123-4567
jane@example.com|Jane Smith|555-987-6543

Format 2 - Phone only:
555-123-4567
555-987-6543
(555) 456-7890

Numbers will be automatically formatted:
- 10 digits → adds "1" prefix
- 11 digits starting with "1" → used as-is`}
                            />
                          </FormControl>
                          <FormDescription>
                            Supports Email|Name|Phone or phone-only format. One contact per line.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={
                        createBulkCallMutation.isPending ||
                        campaignStatus?.status?.status === 'running'
                      }
                    >
                      {createBulkCallMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Campaign...
                        </>
                      ) : campaignStatus?.status?.status === 'running' ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Campaign Running
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Create Campaign
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Campaign List */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Campaigns</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={bulkCallsLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${bulkCallsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {bulkCallsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Loading campaigns...
                  </div>
                ) : bulkCalls.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">
                    No bulk call campaigns yet. Create your first campaign to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bulkCalls.map((campaign) => (
                      <div key={campaign.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                            <p className="text-sm text-slate-600">
                              From: {campaign.callFrom} • Region: {campaign.region}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(campaign.status)}
                            {getStatusBadge(campaign.status)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-slate-900">
                              {campaign.totalContacts}
                            </div>
                            <div className="text-xs text-slate-600">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">
                              {campaign.completedCalls}
                            </div>
                            <div className="text-xs text-slate-600">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-red-600">
                              {campaign.failedCalls}
                            </div>
                            <div className="text-xs text-slate-600">Failed</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-500">
                            <div>Created {new Date(campaign.createdAt).toLocaleDateString()}</div>
                            {campaign.status === 'completed' && (
                              <div>Updated {new Date(campaign.updatedAt).toLocaleTimeString()}</div>
                            )}
                          </div>
                          {campaign.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => startBulkCallMutation.mutate(campaign.id)}
                              disabled={
                                startBulkCallMutation.isPending ||
                                (creditsData?.credits || 0) <= 0 ||
                                campaignStatus?.status?.status === 'running'
                              }
                            >
                              {startBulkCallMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (creditsData?.credits || 0) <= 0 ? (
                                <>
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  No Credits
                                </>
                              ) : campaignStatus?.status?.status === 'running' ? (
                                <>
                                  <Clock className="w-4 h-4 mr-1" />
                                  Running
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-1" />
                                  Start
                                </>
                              )}
                            </Button>
                          )}
                          {campaign.status === 'in-progress' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cancelBulkCallMutation.mutate(campaign.id)}
                              disabled={cancelBulkCallMutation.isPending}
                            >
                              {cancelBulkCallMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Cancel
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}