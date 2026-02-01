import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Settings, Music, Save, RefreshCw, ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateXmlSchema, type UpdateXmlRequest, type XmlSettings } from "@shared/schema";

// Media files are returned as a simple array of filenames
type MediaFile = string;

export default function XmlSettingsPage() {
  const { toast } = useToast();

  const form = useForm<UpdateXmlRequest>({
    resolver: zodResolver(updateXmlSchema),
    defaultValues: {
      introFile: "intro.wav",
      outroFile: "outro.wav",
      connectAction: "https://jellyfish-app-kctk6.ondigitalocean.app/connect",
      inputTimeout: 50000,
      waitTime: 2,
    }
  });

  // Fetch current XML settings
  const { data: settings, isLoading: settingsLoading } = useQuery<XmlSettings>({
    queryKey: ['/api/xml-settings'],
  });

  // Fetch available media files
  const { data: mediaFiles = [], isLoading: mediaLoading, refetch: refetchMedia } = useQuery<MediaFile[]>({
    queryKey: ['/api/mediafiles'],
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        introFile: settings.introFile || "intro.wav",
        outroFile: settings.outroFile || "outro.wav",
        connectAction: settings.connectAction || "https://jellyfish-app-kctk6.ondigitalocean.app/connect",
        inputTimeout: settings.inputTimeout || 50000,
        waitTime: settings.waitTime || 2,
      });
    }
  }, [settings, form]);



  // Update XML settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: UpdateXmlRequest) => {
      const response = await apiRequest('PUT', '/api/xml-settings', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "XML call script settings have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/xml-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || 'Failed to update XML settings',
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: UpdateXmlRequest) => {
    // Set the static connect action URL
    const submissionData = {
      ...data,
      connectAction: "https://jellyfish-app-kctk6.ondigitalocean.app/connect"
    };
    updateSettingsMutation.mutate(submissionData);
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

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
                src="/src/assets/oxyp1-logo.jpg" 
                alt="OXYP1 Logo" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <h1 className="text-xl font-semibold text-slate-800">OXYP1 - XML Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchMedia()}
                disabled={mediaLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${mediaLoading ? 'animate-spin' : ''}`} />
                Refresh Media Files
              </Button>

            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Settings Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Music className="w-5 h-5" />
                  <span>Audio File Selection</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="introFile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intro Audio File</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select intro audio file" />
                              </SelectTrigger>
                              <SelectContent>
                                {mediaFiles.map((file) => (
                                  <SelectItem key={file} value={file}>
                                    {file}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Audio file to play at the beginning of the call
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="outroFile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Outro Audio File</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select outro audio file" />
                              </SelectTrigger>
                              <SelectContent>
                                {mediaFiles.map((file) => (
                                  <SelectItem key={file} value={file}>
                                    {file}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Audio file to play at the end of the call
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />



                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="inputTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Input Timeout (ms)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1000"
                                max="300000"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Time to wait for user input
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="waitTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wait Time (seconds)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                max="30"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Initial wait before playing intro
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateSettingsMutation.isPending}
                      className="w-full"
                    >
                      {updateSettingsMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Update Settings
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Media Files List */}
            <Card>
              <CardHeader>
                <CardTitle>Available Media Files</CardTitle>
              </CardHeader>
              <CardContent>
                {mediaLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Loading media files...
                  </div>
                ) : mediaFiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">
                    No media files found. Upload audio files to your Apidaze account.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-800">{file}</div>
                          <div className="text-sm text-slate-600">Audio File</div>
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