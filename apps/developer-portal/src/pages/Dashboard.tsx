import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ExternalLink, Calendar, Key } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Title } from '@/types';
import {
  Navbar,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Modal,
  Input,
  LoadingSpinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleDescription, setNewTitleDescription] = useState('');

  const { data: titlesResponse, isLoading } = useQuery({
    queryKey: ['titles'],
    queryFn: () => apiClient.getTitles(),
  });

  const titles = titlesResponse?.data?.items || [];

  const createTitleMutation = useMutation({
    mutationFn: () => apiClient.createTitle(newTitleName, newTitleDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      setIsCreateModalOpen(false);
      setNewTitleName('');
      setNewTitleDescription('');
      toast.success('Title created successfully!');
    },
  });

  const deleteTitleMutation = useMutation({
    mutationFn: (titleId: string) => apiClient.deleteTitle(titleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      toast.success('Title deleted successfully!');
    },
  });

  const handleCreateTitle = () => {
    if (!newTitleName.trim()) {
      toast.error('Please enter a title name');
      return;
    }
    createTitleMutation.mutate();
  };

  const handleDeleteTitle = (e: React.MouseEvent, titleId: string, titleName: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${titleName}"?`)) {
      deleteTitleMutation.mutate(titleId);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Titles</h1>
            <p className="text-dark-400 mt-1">
              Manage your game titles and configurations
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Title</span>
          </Button>
        </div>

        {/* Titles List */}
        {titles.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-dark-400 mb-4">
                <Key className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No titles yet</p>
                <p className="text-sm mt-2">
                  Create your first title to get started
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4"
              >
                Create Your First Title
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {titles.map((title: Title) => (
              <Card
                key={title.id}
                className="hover:border-primary-500 transition-colors cursor-pointer"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1" onClick={() => navigate(`/titles/${title.id}`)}>
                      <CardTitle>{title.name}</CardTitle>
                      {title.description && (
                        <p className="text-dark-400 text-sm mt-2">
                          {title.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteTitle(e, title.id, title.name)}
                      className="text-dark-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-dark-400 block mb-1">
                        Title ID
                      </label>
                      <div className="flex items-center justify-between bg-dark-900 px-3 py-2 rounded border border-dark-700">
                        <code className="text-sm text-primary-400 truncate flex-1">
                          {title.id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(title.id, 'Title ID')}
                          className="text-dark-400 hover:text-white ml-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-dark-400 block mb-1">
                        Status
                      </label>
                      <div className="bg-dark-900 px-3 py-2 rounded border border-dark-700">
                        <span className={`text-sm font-medium ${
                          title.status === 'active' ? 'text-green-500' :
                          title.status === 'suspended' ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {title.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center text-xs text-dark-400 pt-2">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created {format(new Date(title.createdAt), 'MMM dd, yyyy')}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => navigate(`/titles/${title.id}`)}
                    >
                      Manage Title
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Title Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Title"
      >
        <div className="space-y-4">
          <Input
            label="Title Name"
            placeholder="My Awesome Game"
            value={newTitleName}
            onChange={(e) => setNewTitleName(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">
              Description (Optional)
            </label>
            <textarea
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="A brief description of your game"
              value={newTitleDescription}
              onChange={(e) => setNewTitleDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTitle}
              isLoading={createTitleMutation.isPending}
            >
              Create Title
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
