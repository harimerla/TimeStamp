import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Plus,
  AlertTriangle,
  Check,
  X,
  Search,
  Calendar,
} from "lucide-react";
import TimeEntryList from "../components/TimeEntryList";
import ExportButton from "../components/ExportButton";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { format, parseISO } from "date-fns";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const AdminPage = () => {
  const { users: authUsers, addUser } = useAuth();
  const { timeEntries } = useTimeTracking();
  const [firebaseUsers, setFirebaseUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "", // changed from username
    password: "",
    name: "",
    role: "staff" as "admin" | "staff",
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);

  // Fetch users directly from Firebase
  useEffect(() => {
    const fetchFirebaseUsers = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        const fetchedUsers = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Unknown User",
            username: data.email || data.username || doc.id,
            role: data.role || "staff",
          };
        });

        setFirebaseUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching Firebase users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFirebaseUsers();
  }, []);

  // Use Firebase users if available, fall back to auth context users
  const users = firebaseUsers.length > 0 ? firebaseUsers : authUsers;
  console.log(firebaseUsers);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Simple validation
    if (!formData.email || !formData.password || !formData.name) {
      setFormError("All fields are required");
      return;
    }

    // Check email uniqueness
    if (users.some((user) => user.username === formData.email)) {
      setFormError("Email already exists");
      return;
    }

    try {
      // Add new user - don't check the result since it's void
      await addUser({
        username: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
      });

      // If no error was thrown, consider it successful
      // Reset form
      setFormData({
        email: "",
        password: "",
        name: "",
        role: "staff",
      });

      // Show success message
      setFormSuccess("User added successfully");
      setTimeout(() => setFormSuccess(null), 3000);

      // Close form
      setShowNewUserForm(false);

      // Refresh the users list
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const fetchedUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unknown User",
        username: doc.data().email || doc.data().username || doc.id,
        role: doc.data().role || "staff",
      }));
      setFirebaseUsers(fetchedUsers);
    } catch (error) {
      console.error("Error adding user:", error);
      setFormError("Failed to add user");
    }
  };

  // Get filtered entries for export
  const getFilteredEntries = () => {
    return timeEntries.filter((entry) => {
      // Filter by user if selected
      if (selectedUser && entry.userId !== selectedUser) {
        return false;
      }

      // Filter by date range if active
      if (isDateFilterActive) {
        const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
        const startDate = format(parseISO(dateFilter.startDate), "yyyy-MM-dd");
        const endDate = format(parseISO(dateFilter.endDate), "yyyy-MM-dd");

        // Check if entry date is within filter range
        return entryDate >= startDate && entryDate <= endDate;
      }

      return true;
    });
  };

  // Just add a loading indicator
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading users...</div>
      </div>
    );
  }

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
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
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
              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">
                      Date Filter:
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center space-x-2">
                      <label
                        htmlFor="startDate"
                        className="text-sm text-gray-600"
                      >
                        From:
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        value={dateFilter.startDate}
                        onChange={(e) => {
                          setDateFilter((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                          }));
                        }}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <label
                        htmlFor="endDate"
                        className="text-sm text-gray-600"
                      >
                        To:
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        value={dateFilter.endDate}
                        onChange={(e) => {
                          setDateFilter((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }));
                        }}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <button
                        onClick={() => {
                          // Validate dates
                          if (dateFilter.startDate > dateFilter.endDate) {
                            // Swap dates if start is after end
                            setDateFilter({
                              startDate: dateFilter.endDate,
                              endDate: dateFilter.startDate,
                            });
                          }
                          setIsDateFilterActive(true);
                        }}
                        className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700"
                      >
                        Apply Filter
                      </button>

                      {isDateFilterActive && (
                        <button
                          onClick={() => {
                            setIsDateFilterActive(false);
                          }}
                          className="ml-2 px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isDateFilterActive && (
                  <div className="mt-2 text-sm text-primary-600">
                    Showing entries from{" "}
                    {format(parseISO(dateFilter.startDate), "MMM d, yyyy")} to{" "}
                    {format(parseISO(dateFilter.endDate), "MMM d, yyyy")}
                  </div>
                )}
              </div>

              <TimeEntryList
                userId={selectedUser || undefined}
                dateRange={isDateFilterActive ? dateFilter : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
