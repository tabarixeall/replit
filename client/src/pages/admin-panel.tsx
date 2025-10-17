import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Users, Shield, Phone, Activity, UserPlus, Trash2, 
  Pause, Play, CheckCircle, XCircle, Clock, 
  RefreshCw, LogOut, CreditCard, Plus, User as UserIcon, Mail, Calendar, ArrowLeft, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { adminCreateUserSchema, updateSystemSettingsSchema, type AdminCreateUserRequest, type UpdateSystemSettingsRequest, type SystemSettings, type User, type Call, type SystemLog } from "@shared/schema";
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

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  todayCalls: number;
}

function SystemSettingsForm() {
  const { toast } = useToast();

  // Fetch current system settings
  const { data: settings, isLoading: settingsLoading } = useQuery<SystemSettings>({
    queryKey: ['/api/system-settings'],
  });

  // Setup form with validation
  const form = useForm<UpdateSystemSettingsRequest>({
    resolver: zodResolver(updateSystemSettingsSchema),
    defaultValues: {
      concurrency: 100,
      delayBetweenBatches: 2000,
      delayBetweenCalls: 0,
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        concurrency: settings.concurrency || 100,
        delayBetweenBatches: settings.delayBetweenBatches || 2000,
        delayBetweenCalls: settings.delayBetweenCalls || 0,
      });
    }
  }, [settings, form]);

  // Update system settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: UpdateSystemSettingsRequest) => {
      const response = await apiRequest('PUT', '/api/system-settings', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "System settings have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || 'Failed to update system settings',
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: UpdateSystemSettingsRequest) => {
    updateSettingsMutation.mutate(data);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="concurrency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concurrency Limit</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                  placeholder="100"
                />
              </FormControl>
              <FormDescription className="text-sm text-slate-500">
                Maximum number of simultaneous calls per batch (1-1000)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="delayBetweenBatches"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delay Between Batches (ms)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="60000"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 2000)}
                  placeholder="2000"
                />
              </FormControl>
              <FormDescription className="text-sm text-slate-500">
                Wait time between processing batches in milliseconds (0-60000)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="delayBetweenCalls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delay Between Calls (ms)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </FormControl>
              <FormDescription className="text-sm text-slate-500">
                Wait time between individual calls within a batch in milliseconds (0-10000)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={updateSettingsMutation.isPending}
          className="w-full"
        >
          {updateSettingsMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Updating Settings...
            </>
          ) : (
            'Update Settings'
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function AdminPanel() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isAddCreditsOpen, setIsAddCreditsOpen] = useState(false);
  const [isEditCreditsOpen, setIsEditCreditsOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState<number>(0);
  const [creditsToSet, setCreditsToSet] = useState<number>(0);

  // Fetch admin stats
  const { data: stats } = useQuery<{ success: boolean; stats: AdminStats }>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch users
  const { data: usersData, refetch: refetchUsers } = useQuery<{ success: boolean; users: User[] }>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch calls
  const { data: callsData } = useQuery<{ success: boolean; calls: Call[] }>({
    queryKey: ['/api/admin/calls'],
  });

  // Fetch webhook responses (admin - all responses)
  const { data: webhookData, refetch: refetchWebhooks } = useQuery<WebhookResponse[]>({
    queryKey: ['/api/admin/webhook-responses'],
  });

  // Fetch system logs
  const { data: logsData } = useQuery<{ success: boolean; logs: SystemLog[] }>({
    queryKey: ['/api/admin/logs'],
  });

  const createUserForm = useForm<AdminCreateUserRequest>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "user",
      credits: 0,
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: AdminCreateUserRequest) => {
      const response = await apiRequest('POST', '/api/admin/users', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User Created",
        description: `User ${data.user.username} created successfully`,
      });
      setGeneratedPassword(data.generatedPassword);
      createUserForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || 'Failed to create user',
        variant: "destructive"
      });
    }
  });

  // Suspend user mutation
  const suspendUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/suspend`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User Suspended",
        description: `User ${data.user.username} has been suspended`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Suspend Failed",
        description: error.message || 'Failed to suspend user',
        variant: "destructive"
      });
    }
  });

  // Unsuspend user mutation
  const unsuspendUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/unsuspend`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User Unsuspended",
        description: `User ${data.user.username} has been unsuspended`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Unsuspend Failed",
        description: error.message || 'Failed to unsuspend user',
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/users/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "User has been permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || 'Failed to delete user',
        variant: "destructive"
      });
    }
  });

  // Add credits mutation
  const addCreditsMutation = useMutation({
    mutationFn: async (data: { userId: number; credits: number }) => {
      const response = await apiRequest('POST', `/api/admin/users/${data.userId}/credits`, {
        credits: data.credits,
        action: 'add'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Added ${creditsToAdd} credits successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsAddCreditsOpen(false);
      setCreditsToAdd(0);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive"
      });
    }
  });

  // Set credits mutation
  const setCreditsMutation = useMutation({
    mutationFn: async (data: { userId: number; credits: number }) => {
      const response = await apiRequest('POST', `/api/admin/users/${data.userId}/credits`, {
        credits: data.credits,
        action: 'set'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Set credits to ${creditsToSet} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditCreditsOpen(false);
      setCreditsToSet(0);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set credits",
        variant: "destructive",
      });
    },
  });

  // Delete webhook response mutation (admin)
  const deleteWebhookMutation = useMutation({
    mutationFn: async (responseId: number) => {
      await apiRequest(`/api/admin/webhook-responses/${responseId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhook-responses"] });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Suspended</Badge>;
      case 'deleted':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Deleted</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Admin</Badge>;
      case 'user':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">User</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{role}</Badge>;
    }
  };

  const getCallStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const onSubmit = (data: AdminCreateUserRequest) => {
    createUserMutation.mutate(data);
  };

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => window.location.href = '/'}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Button>
              <img 
                src={oxyp1Logo} 
                alt="OXYP1 Logo" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <h1 className="text-xl font-semibold text-slate-800">OXYP1 - Admin Panel</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => refetchUsers()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={() => window.location.href = '/api/auth/logout'}
                variant="ghost"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.stats.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-900">{stats?.stats.activeUsers || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Calls</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.stats.totalCalls || 0}</p>
                </div>
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Today's Calls</p>
                  <p className="text-2xl font-bold text-purple-900">{stats?.stats.todayCalls || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="calls">Call History</TabsTrigger>
            <TabsTrigger value="webhooks">Pressed 1 Data</TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
              <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account. A password will be generated automatically.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {generatedPassword && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Generated Password</h4>
                      <code className="text-sm bg-white px-2 py-1 rounded border">
                        {generatedPassword}
                      </code>
                      <p className="text-xs text-green-700 mt-2">
                        Please save this password securely. It won't be shown again.
                      </p>
                    </div>
                  )}

                  <Form {...createUserForm}>
                    <form onSubmit={createUserForm.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={createUserForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={createUserMutation.isPending} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createUserForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={createUserMutation.isPending} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={createUserForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={createUserMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createUserForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} disabled={createUserMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createUserForm.control}
                        name="credits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Credits</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                disabled={createUserMutation.isPending} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createUserForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-3 pt-4">
                        <Button 
                          type="submit" 
                          disabled={createUserMutation.isPending}
                          className="flex-1"
                        >
                          {createUserMutation.isPending ? "Creating..." : "Create User"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsCreateUserOpen(false);
                            setGeneratedPassword(null);
                            createUserForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Add Credits Dialog */}
              <Dialog open={isAddCreditsOpen} onOpenChange={setIsAddCreditsOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Credits</DialogTitle>
                    <DialogDescription>
                      Add credits to {selectedUser?.username}'s account
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Current Credits</label>
                      <p className="text-2xl font-bold text-blue-600">{selectedUser?.credits || 0}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Credits to Add</label>
                      <Input
                        type="number"
                        min="1"
                        value={creditsToAdd}
                        onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)}
                        placeholder="Enter amount"
                      />
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button 
                        onClick={() => {
                          if (selectedUser && creditsToAdd > 0) {
                            addCreditsMutation.mutate({
                              userId: selectedUser.id,
                              credits: creditsToAdd
                            });
                          }
                        }}
                        disabled={addCreditsMutation.isPending || creditsToAdd <= 0}
                        className="flex-1"
                      >
                        {addCreditsMutation.isPending ? "Adding..." : "Add Credits"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsAddCreditsOpen(false);
                          setCreditsToAdd(0);
                          setSelectedUser(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-slate-500">@{user.username}</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role || 'user')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {user.credits || 0} credits
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsAddCreditsOpen(true);
                              }}
                              title="Add Credits"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setCreditsToSet(user.credits || 0);
                                setIsEditCreditsOpen(true);
                              }}
                              title="Edit Credits"
                            >
                              <CreditCard className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status || 'active')}</TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(user.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => suspendUserMutation.mutate(user.id)}
                                disabled={suspendUserMutation.isPending}
                                title="Suspend User"
                              >
                                <Pause className="w-3 h-3" />
                              </Button>
                            )}
                            {user.status === 'suspended' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unsuspendUserMutation.mutate(user.id)}
                                disabled={unsuspendUserMutation.isPending}
                                title="Unsuspend User"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this user?')) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteUserMutation.isPending}
                              title="Delete User"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calls Tab */}
          <TabsContent value="calls" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Call History</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callsData?.calls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getCallStatusIcon(call.status)}
                            <span className="capitalize">{call.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>{call.callFrom}</TableCell>
                        <TableCell>{call.callTo}</TableCell>
                        <TableCell>{call.region}</TableCell>
                        <TableCell>{call.duration || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(call.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Pressed 1 Data Management</h2>
              <Button 
                onClick={() => refetchWebhooks()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>All Webhook Responses</CardTitle>
                <CardDescription>
                  Manage all button press data from campaigns across all users
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {webhookData && webhookData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact Details</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhookData.map((response) => {
                        const responseUser = usersData?.users.find(u => u.id === response.userId);
                        return (
                          <TableRow key={response.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {response.contactName && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <UserIcon className="w-3 h-3" />
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
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span className="font-mono text-xs">{response.phoneNumber}</span>
                                <Badge variant="outline" className="text-xs">
                                  Pressed {response.buttonPressed}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium">
                                {response.campaignName || "Unknown Campaign"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs">
                                {responseUser?.username || `User ${response.userId}`}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDateTime(response.timestamp)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
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
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this response data?')) {
                                      deleteWebhookMutation.mutate(response.id);
                                    }
                                  }}
                                  disabled={deleteWebhookMutation.isPending}
                                  title="Delete Response"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No webhook responses recorded yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">System Logs</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData?.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {log.action.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.userId || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.details || 'N/A'}
                        </TableCell>
                        <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
            <Card>
              <CardHeader>
                <CardTitle>Call Processing Configuration</CardTitle>
                <CardDescription>
                  Configure speed and concurrency settings for bulk calling campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SystemSettingsForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Credits Dialog */}
      <Dialog open={isEditCreditsOpen} onOpenChange={setIsEditCreditsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credits</DialogTitle>
            <DialogDescription>
              Set the exact number of credits for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Current Credits: {selectedUser?.credits || 0}
              </label>
              <Input
                type="number"
                min="0"
                value={creditsToSet}
                onChange={(e) => setCreditsToSet(parseInt(e.target.value) || 0)}
                placeholder="Enter exact credits amount"
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditCreditsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedUser) {
                    setCreditsMutation.mutate({
                      userId: selectedUser.id,
                      credits: creditsToSet
                    });
                  }
                }}
                disabled={setCreditsMutation.isPending}
              >
                {setCreditsMutation.isPending ? "Setting..." : "Set Credits"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}