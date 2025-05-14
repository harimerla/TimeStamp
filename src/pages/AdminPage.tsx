import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Plus, AlertTriangle, Check, X, Search } from "lucide-react";
import TimeEntryList from "../components/TimeEntryList";
import ExportButton from "../components/ExportButton";
import { useTimeTracking } from "../context/TimeTrackingContext";

const AdminPage = () => {
  const { users, addUser } = useAuth();
  const { timeEntries } = useTimeTracking();
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role: "staff" as "admin" | "staff",
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Simple validation
    if (!formData.username || !formData.password || !formData.name) {
      setFormError("All fields are required");
      return;
    }

    // Check username uniqueness
    if (users.some((user) => user.username === formData.username)) {
      setFormError("Username already exists");
      return;
    }

    // Add new user
    addUser(formData);

    // Reset form
    setFormData({
      username: "",
      password: "",
      name: "",
      role: "staff",
    });

    // Show success message
    setFormSuccess("User added successfully");
    setTimeout(() => setFormSuccess(null), 3000);

    // Close form
    setShowNewUserForm(false);
  };

  // Get filtered entries for export
  const getFilteredEntries = () => {
    if (selectedUser) {
      return timeEntries.filter((entry) => entry.userId === selectedUser);
    }
    return timeEntries;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">Manage users and view all time entries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">Staff Members</h2>
              <button
                onClick={() => setShowNewUserForm(!showNewUserForm)}
                className="p-1 rounded-full hover:bg-primary-500"
              >
                {showNewUserForm ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-3 pr-16 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-2">
                  {userSearchTerm && (
                    <button
                      onClick={() => setUserSearchTerm("")}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {/* <Search className="h-4 w-4 text-gray-400" /> */}
                </div>
              </div>
            </div>

            {showNewUserForm && (
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-md font-medium mb-3">Add New User</h3>
                <form onSubmit={handleSubmit}>
                  {formError && (
                    <div className="mb-3 text-sm text-error-700 bg-error-50 p-2 rounded flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="mb-3 text-sm text-success-700 bg-success-50 p-2 rounded flex items-center">
                      <Check className="h-4 w-4 mr-1" />
                      {formSuccess}
                    </div>
                  )}

                  <div className="mb-3">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="role"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowNewUserForm(false)}
                      className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                    >
                      Add User
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="p-4 max-h-96 overflow-y-auto">
              <ul className="space-y-2">
                {filteredUsers.map((user) => (
                  <li key={user.id}>
                    <button
                      onClick={() =>
                        setSelectedUser(
                          user.id === selectedUser ? null : user.id
                        )
                      }
                      className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 ${
                        user.id === selectedUser
                          ? "bg-primary-50 text-primary-700"
                          : ""
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-gray-500">
                          @{user.username}
                        </div>
                      </div>
                      <div className="text-xs uppercase bg-gray-100 px-2 py-1 rounded">
                        {user.role}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {selectedUser
                  ? `Time Entries: ${
                      users.find((u) => u.id === selectedUser)?.name
                    }`
                  : "All Time Entries"}
              </h2>

              <div className="flex space-x-2">
                <ExportButton
                  data={getFilteredEntries()}
                  users={users}
                  type="excel"
                  filename={`time-entries-${
                    selectedUser
                      ? users.find((u) => u.id === selectedUser)?.username
                      : "all"
                  }`}
                />
                <ExportButton
                  data={getFilteredEntries()}
                  users={users}
                  type="pdf"
                  filename={`time-entries-${
                    selectedUser
                      ? users.find((u) => u.id === selectedUser)?.username
                      : "all"
                  }`}
                />
              </div>
            </div>

            <div className="p-4">
              <TimeEntryList userId={selectedUser || undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
