// Function
import { motion } from 'framer-motion';

// Imports
import Navbar from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider"

// Shadcn Imports
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Firebase Imports
import { signOut } from "firebase/auth";
import { FormEvent, useState } from "react";
import { auth, db } from "@/config/firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, addDoc, getDocs, serverTimestamp, setDoc, getDoc, deleteDoc } from "firebase/firestore";

interface AddTask {
    id: string | null;
    taskName: string;
    description: string;
}

function App() {
    const [user, setUser] = useState(false);
    const [userID, setUserID] = useState("");
    const [tasks, setTasks] = useState<AddTask[]>([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isAddingTask, setIsAddingTask] = useState(false);

    // Fetch tasks if admin
    const fetchTasks = async () => {
        try {
            const tasksRef = collection(db, "tasks");
            const tasksSnapshot = await getDocs(tasksRef);
            const tasksList: AddTask[] = [];
            tasksSnapshot.forEach((doc) => {
                tasksList.push({ id: doc.id, ...doc.data() } as unknown as AddTask);
            });
            const tasks_List = tasksList.reverse();
            setTasks(tasks_List);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setError("Failed to fetch tasks.");
        } 
    };    

    // Handle adding new tasks
    const handleAddTask = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const target = e.target as typeof e.target & {
            taskName: { value: string };
            description: { value: string };
        };

        const taskName = target.taskName.value;
        const description = target.description.value;

        try {
            const docRef = await addDoc(collection(db, "tasks"), {
                taskName: taskName,
                description: description,
            });
            console.log("Document written with ID: ", docRef.id);
            await fetchTasks();
            setMessage("Task added successfully");
        } catch (error) {
            console.error("Error adding document: ", error);
            setError("Failed to add task.");
        } finally {
            setIsLoading(false);
            setIsAddingTask(!isAddingTask)
        }
    };

    // Login
    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const target = e.target as typeof e.target & {
            loginEmail: { value: string };
            loginPassword: { value: string };
        };

        const email = target.loginEmail.value;
        const password = target.loginPassword.value;

        try {
            // Handle login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const loggedInUser = userCredential.user.uid;
            setUserID(loggedInUser);
            const userRef = doc(db, "users", loggedInUser);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                console.log("User exists");
                setUser(true);
                await fetchTasks();
                setMessage("Login successful!");
            } else {
                console.log("User does not exist");
                await signOut(auth);
                handleSignOut();
                setError("Useris not an admin.");
            }
            // Fetch tasks if admin
        } catch (error) {
            setError("Error logging in:");
            if (error instanceof Error) {
                setMessage(error.message);
            } else {
                setMessage("An unknown error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Register
    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const target = e.target as typeof e.target & {
            registerEmail: { value: string };
            registerPassword: { value: string };
            confirmPassword: { value: string };
        };

        const email = target.registerEmail.value;
        const password = target.registerPassword.value;
        const confirmPassword = target.confirmPassword.value;

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const registeredUser = userCredential.user.uid;
            setUserID(registeredUser);
            setUser(true);
            setMessage("Registration successful!");

            await setDoc(doc(db, "users", registeredUser), {
                userID: registeredUser,
                email: email,
                createdAt: serverTimestamp(),
                userRole: "admin",
            });
            await fetchTasks();
        } catch (error) {
            if (error instanceof Error) {
                setError("Error registering user");
                setMessage(error.message);
            } else {
                setMessage("An unknown error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Sign Out
    const handleSignOut = async () => {
        setUserID("");
        setUser(false);
        setTasks([]);
        setError("");
        setMessage("");
        setIsLoading(false);
    };

    // Delete Task
    const handleDeleteTask = async (id: string) => {
        try {
            await deleteDoc(doc(db, "tasks", id));
            await fetchTasks();
            setMessage("Task deleted successfully");
        } catch (error) {
            console.error("Error deleting task:", error);
            setError("Failed to delete task.");
        }
    };

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            {userID && <Navbar onSignOut={handleSignOut} />}
            <div className={`p-6 flex flex-col justify-center items-center h-full w-full text-white ${userID ? "min-h-[calc(100vh-100px)]" : "min-h-screen" }`}>
                {!user ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Card className="w-[350px]">
                            <CardHeader className="space-x-1">
                                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                                <CardDescription>Enter your email to sign in or create an account</CardDescription>
                            </CardHeader>
                            <Tabs defaultValue="login" className="w-full">
                                <div className="pb-6 px-6">
                                    <TabsList className="grid w-full grid-cols-1">
                                        <TabsTrigger value="login">Login</TabsTrigger>
                                        {/* <TabsTrigger value="register">Register</TabsTrigger> */}
                                    </TabsList>
                                </div>

                                {/* Login Form with animation */}
                                <TabsContent value="login">
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} >
                                        <form onSubmit={handleLogin}>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="loginEmail">Email</Label>
                                                    <Input type="email" id="loginEmail" placeholder="john@gmail.com" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="loginPassword">Password</Label>
                                                    <Input type="password" id="loginPassword" placeholder="********" required />
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button className="w-full" type="submit" disabled={isLoading}>
                                                    {isLoading ? "Signing In..." : "Sign In"}
                                                </Button>
                                            </CardFooter>
                                        </form>
                                    </motion.div>
                                </TabsContent>

                                {/* Registration Form with animation */}
                                <TabsContent value="register">
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} >
                                        <form onSubmit={handleRegister}>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="registerEmail">Email</Label>
                                                    <Input type="email" id="registerEmail" placeholder="john@gmail.com" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="registerPassword">Password</Label>
                                                    <Input type="password" id="registerPassword" placeholder="********" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                                    <Input type="password" id="confirmPassword" placeholder="********" required />
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button className="w-full" type="submit" disabled={isLoading}>
                                                    {isLoading ? "Registering..." : "Register"}
                                                </Button>
                                            </CardFooter>
                                        </form>
                                    </motion.div>
                                </TabsContent>
                            </Tabs>
                        </Card>
                    </motion.div>
                ) : (
                    <div>
                        <h2>User ID: {userID}</h2>
                        <div className="py-3">
                            <div className="flex w-full justify-between items-center">
                                <div>Tasks</div>
                                <Button onClick={() => setIsAddingTask(!isAddingTask)}>
                                    {isAddingTask ? "Close" : "Add Task"}
                                </Button>
                            </div>
                        </div>
                        {isAddingTask && (
                            <div>
                                <h2>Add Task</h2>
                                <form onSubmit={handleAddTask} className="border dark:border-gray-700 p-5 rounded-3xl gap-6 shadow-lg bg-gray-800">
                                    <div className="mb-4">
                                        <label htmlFor="taskName" className="block">Task Name:</label>
                                        <Input type="text" id="taskName" placeholder="Task Name" required />
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="description" className="block">Description:</label>
                                        <Input type="text" id="description" placeholder="Description" required />
                                    </div>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? "Adding Task..." : "Add Task"}
                                    </Button>
                                </form>
                            </div>
                        )}
                        {!isAddingTask && (
                            <Table>
                                <TableCaption>Tasks</TableCaption>
                                <TableHeader>
                                    <TableRow className="text-center">
                                        <TableHead>Task Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.map((task) => (
                                        <TableRow key={task.id}>
                                            <TableCell>{task.taskName}</TableCell>
                                            <TableCell>{task.description}</TableCell>
                                            <TableCell>
                                                <Button onClick={() => task.id && handleDeleteTask(task.id)}>Delete</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}
                {error && <p className="text-red-500">{error}</p>}
                {message && <p className="text-green-500">{message}</p>}
            </div>
        </ThemeProvider>
    );
}

export default App;
