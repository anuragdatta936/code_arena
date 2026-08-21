import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Define the user type for our mock data
interface User {
  id: number;
  username: string;
  email: string;
  rating: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  joinDate: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // For demo purposes, we'll just check if we have token and mock the data
  const token = localStorage.getItem('token');
  if (token && !userData) {
    const mockUser = {
      id: 1,
      username: 'codearena_user',
      email: 'user@example.com',
      rating: 1200,
      totalSubmissions: 42,
      acceptedSubmissions: 28,
      joinDate: '2026-01-15',
    };
    setUserData(mockUser);
  }

  if (!token) {
    navigate('/login');
    return null; // Return null to prevent rendering while redirecting
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleEdit = () => {
    if (userData) {
      setEditUsername(userData.username);
      setEditEmail(userData.email);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    // In a real app, this would call an API to update user data
    setUserData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        username: editUsername,
        email: editEmail,
      };
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (!userData) {
    return <div className="text-center py-10">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Profile
            </h1>
            <button
              onClick={handleLogout}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {!isEditing ? (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                    {userData.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {userData.username}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      Member since {new Date(userData.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Account Info</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Email:</span> {userData.email}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Username:</span> {userData.username}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>Rating:</span>
                      <span className="font-medium">{userData.rating}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>Total Submissions:</span>
                      <span className="font-medium">{userData.totalSubmissions}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>Accepted Submissions:</span>
                      <span className="font-medium">{userData.acceptedSubmissions}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>Acceptance Rate:</span>
                      <span className="font-medium">
                        {Math.round((userData.acceptedSubmissions / userData.totalSubmissions) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleEdit}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Edit Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;