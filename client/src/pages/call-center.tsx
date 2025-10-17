import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Phone, PhoneCall, Globe, History, Download, CheckCircle, XCircle, Clock, ArrowRight, MoreHorizontal, Settings, Users, BarChart3, LogOut, Shield, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { makeCallSchema, type MakeCallRequest, type Call } from "@shared/schema.js";
import oxyp1Logo from "@/assets/oxyp1-logo.jpg";

export default function CallCenter() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [callStatus, setCallStatus] = useState<{ show: boolean; success: boolean; message: string; callId?: string }>({
    show: false,
    success: false,
    message: ""
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Logout Failed",
        description: error.message || 'Failed to log out',
        variant: "destructive"
      });
    }
  });

  const form = useForm<MakeCallRequest>({
    resolver: zodResolver(makeCallSchema),
    defaultValues: {
      callFrom: "",
      callTo: "",
      region: "US-EAST"
    }
  });

  // Fetch call history
  const { data: calls = [] } = useQuery<Call[]>({
    queryKey: ['/api/calls'],
  });

  // Fetch call stats
  const { data: stats = { totalCalls: 0, successfulCalls: 0 } } = useQuery<{ totalCalls: number; successfulCalls: number }>({
    queryKey: ['/api/calls/stats'],
  });

  // Fetch user credits
  const { data: creditsData } = useQuery<{ success: boolean; credits: number }>({
    queryKey: ['/api/credits'],
  });

  // Fetch campaign status
  const { data: campaignStatus } = useQuery<{ success: boolean; status: any }>({
    queryKey: ['/api/campaign-status'],
  });

  // Make call mutation
  const makeCallMutation = useMutation({
    mutationFn: async (data: MakeCallRequest) => {
      const response = await apiRequest('POST', '/api/calls', data);
      return response.json();
    },
    onSuccess: (data) => {
      setCallStatus({
        show: true,
        success: true,
        message: data.message,
        callId: data.call_id
      });
      toast({
        title: "Call Initiated",
        description: "Call has been successfully initiated",
      });
      // Refresh call history, stats, and credits
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calls/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      form.reset();
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to initiate call';
      setCallStatus({
        show: true,
        success: false,
        message: errorMessage
      });
      toast({
        title: "Call Failed",
        description: errorMessage,
        variant: "destructive"
      });
      // Still refresh in case the failed call was stored
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calls/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
    }
  });

  const onSubmit = (data: MakeCallRequest) => {
    setCallStatus({ show: false, success: false, message: "" });
    makeCallMutation.mutate(data);
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-600" />;
      case 'in-progress':
        return <Clock className="w-3 h-3 text-yellow-600" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'in-progress':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img 
                src={oxyp1Logo} 
                alt="OXYP1 Logo" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <h1 className="text-xl font-semibold text-slate-800">OXYP1</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/webhook-dashboard">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-700">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/bulk-calls">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-700">
                  <Users className="w-4 h-4 mr-2" />
                  Bulk Calls
                </Button>
              </Link>
              <Link href="/xml-settings">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-700">
                  <Settings className="w-4 h-4 mr-2" />
                  XML Settings
                </Button>
              </Link>
              
              {/* Admin Panel - only show for admin users */}
              {user?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-700">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              
              {/* Connection Status */}
              <ConnectionStatus />
              
              {/* User Info */}
              <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">@{user?.username}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-slate-600 hover:text-slate-700"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Call Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Credits Display */}
            <Card className="shadow-sm border border-slate-200">
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
                  {(creditsData?.credits || 0) <= 5 && (
                    <div className="text-right">
                      <p className="text-xs text-amber-600 font-medium">Low Balance</p>
                      <p className="text-xs text-slate-500">Contact admin</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Each call costs 1 credit
                    {campaignStatus?.status?.status === 'running' && (
                      <span className="block text-amber-600 font-medium mt-1">
                        • Campaign in progress - single calls disabled
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Make a Call</h2>
                    <p className="text-sm text-slate-600">Enter call details to initiate</p>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="callFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Call From <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="w-4 h-4 text-slate-400" />
                              </div>
                              <Input
                                {...field}
                                type="tel"
                                placeholder="18447077788"
                                className="pl-10 py-3 border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-slate-500">Your outbound caller ID number</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="callTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Call To <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="w-4 h-4 text-slate-400" />
                              </div>
                              <Input
                                {...field}
                                type="tel"
                                placeholder="13125096051"
                                className="pl-10 py-3 border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-slate-500">Destination phone number</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Region <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <Globe className="w-4 h-4 text-slate-400" />
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="pl-10 py-3 border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="US-EAST">US East</SelectItem>
                                  <SelectItem value="US-WEST">US West</SelectItem>
                                  <SelectItem value="EU-CENTRAL">EU Central</SelectItem>
                                  <SelectItem value="ASIA-PACIFIC">Asia Pacific</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={
                        makeCallMutation.isPending || 
                        (creditsData?.credits || 0) <= 0 || 
                        campaignStatus?.status?.status === 'running'
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      {makeCallMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Calling...</span>
                        </>
                      ) : (creditsData?.credits || 0) <= 0 ? (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>No Credits</span>
                        </>
                      ) : campaignStatus?.status?.status === 'running' ? (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>Campaign Active</span>
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          <span>Make Call</span>
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Call Status */}
                {callStatus.show && (
                  <div className="mt-6">
                    {callStatus.success ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-green-800">Call Initiated Successfully</h3>
                            <p className="mt-1 text-sm text-green-700">{callStatus.message}</p>
                            {callStatus.callId && (
                              <p className="mt-1 text-xs text-green-600">Call ID: {callStatus.callId}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800">Call Failed</h3>
                            <p className="mt-1 text-sm text-red-700">{callStatus.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6 shadow-sm border border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Today's Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalCalls}</div>
                    <div className="text-xs text-slate-600">Total Calls</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.successfulCalls}</div>
                    <div className="text-xs text-slate-600">Successful</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call History */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <History className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Call History</h2>
                      <p className="text-sm text-slate-600">Recent outbound calls</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Call Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {calls.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                            No calls made yet. Use the form to make your first call.
                          </td>
                        </tr>
                      ) : (
                        calls.map((call) => (
                          <tr key={call.id} className="hover:bg-slate-50 transition-colors duration-150">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="text-sm font-medium text-slate-900">
                                    {formatPhoneNumber(call.callTo)}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  From: {formatPhoneNumber(call.callFrom)} • {call.region}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={getStatusBadge(call.status)}>
                                {getStatusIcon(call.status)}
                                <span className="ml-1 capitalize">{call.status}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900">
                              {call.duration || '--'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {formatTime(call.timestamp.toString())}
                            </td>
                            <td className="px-6 py-4">
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4 text-slate-400" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {calls.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(50, calls.length)}</span> of <span className="font-medium">{calls.length}</span> calls
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" disabled>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
