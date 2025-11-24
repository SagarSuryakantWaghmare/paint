// API client for backend communication
// Handles authentication, project management, and S3 uploads

const API_BASE_URL = window.location.origin;

/**
 * Get authentication token from sessionStorage
 * @returns {string | null}
 */
export function getAuthToken() {
	return sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || null;
}

/**
 * Set authentication token in sessionStorage
 * @param {string} token
 */
export function setAuthToken(token) {
	sessionStorage.setItem("auth_token", token);
}

/**
 * Clear authentication token
 */
export function clearAuthToken() {
	sessionStorage.removeItem("auth_token");
	localStorage.removeItem("auth_token");
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
	return !!getAuthToken();
}

// Listen for auth token from parent window (for iframe usage)
if (window.self !== window.top) {
	window.addEventListener("message", (event) => {
		// Only accept messages from trusted parent origins
		// You can add origin validation here if needed
		const data = event.data || {};

		if (data.type === "SET_AUTH_TOKEN" && data.token) {
			setAuthToken(data.token);
			console.log("Auth token received from parent window");

			// Notify parent that token was set
			window.parent.postMessage({
				type: "AUTH_STATUS",
				authenticated: true,
			}, "*");
		}

		if (data.type === "CLEAR_AUTH_TOKEN") {
			clearAuthToken();
			console.log("Auth token cleared by parent window");

			// Notify parent that token was cleared
			window.parent.postMessage({
				type: "AUTH_STATUS",
				authenticated: false,
			}, "*");
		}

		if (data.type === "CHECK_AUTH_STATUS") {
			// Send current auth status to parent
			window.parent.postMessage({
				type: "AUTH_STATUS",
				authenticated: isAuthenticated(),
			}, "*");
		}
	});
}

/**
 * Request authentication from parent window (when running in iframe)
 */
export function requestAuthFromParent() {
	if (window.self !== window.top) {
		window.parent.postMessage({ type: "REQUEST_AUTH" }, "*");
		console.log("Requesting authentication from parent window");
	} else {
		console.warn("Not running in iframe - cannot request auth from parent");
	}
}

/**
 * Upload file to S3 using presigned URL
 * @param {File | Blob} file
 * @param {string} presignedUrl
 * @returns {Promise<{status: boolean, error: any}>}
 */
export async function uploadToS3(file, presignedUrl) {
	try {
		const response = await fetch(presignedUrl, {
			method: "PUT",
			body: file,
			headers: {
				"Content-Type": file.type || "application/octet-stream",
			},
		});

		if (!response.ok) {
			throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
		}

		return { status: true, error: null };
	} catch (error) {
		console.error("S3 upload error:", error);
		return { status: false, error };
	}
}

/**
 * Get presigned URL for S3 upload
 * @param {string} fileName
 * @param {string} fileType
 * @returns {Promise<{uploadUrl: string, fileKey: string, imageUrl: string}>}
 */
export async function getPresignedUploadUrl(fileName, fileType) {
	const token = getAuthToken();
	const response = await fetch(`${API_BASE_URL}/api/projects/presigned-upload`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": token ? `Bearer ${token}` : "",
		},
		body: JSON.stringify({ fileName, fileType }),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get presigned URL: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Create a new project
 * @param {FormData} formData
 * @returns {Promise<any>}
 */
export async function createProject(formData) {
	const token = getAuthToken();
	const response = await fetch(`${API_BASE_URL}/api/projects`, {
		method: "POST",
		headers: {
			"Authorization": token ? `Bearer ${token}` : "",
		},
		body: formData,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to create project: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Update an existing project
 * @param {string} projectId
 * @param {FormData} formData
 * @returns {Promise<any>}
 */
export async function updateProject(projectId, formData) {
	const token = getAuthToken();
	const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
		method: "PUT",
		headers: {
			"Authorization": token ? `Bearer ${token}` : "",
		},
		body: formData,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to update project: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Get all projects for authenticated user
 * @returns {Promise<any[]>}
 */
export async function getAllProjects() {
	const token = getAuthToken();
	const response = await fetch(`${API_BASE_URL}/api/projects`, {
		method: "GET",
		headers: {
			"Authorization": token ? `Bearer ${token}` : "",
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get projects: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Get a specific project by ID
 * @param {string} projectId
 * @returns {Promise<any>}
 */
export async function getProjectById(projectId) {
	const token = getAuthToken();
	const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
		method: "GET",
		headers: {
			"Authorization": token ? `Bearer ${token}` : "",
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get project: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Delete a project
 * @param {string} projectId
 * @returns {Promise<any>}
 */
export async function deleteProject(projectId) {
	const token = getAuthToken();
	const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
		method: "DELETE",
		headers: {
			"Authorization": token ? `Bearer ${token}` : "",
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to delete project: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Exchange OAuth code for access token
 * @param {string} code
 * @returns {Promise<string>}
 */
export async function exchangeCodeForToken(code) {
	const response = await fetch(`${API_BASE_URL}/api/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ code }),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to exchange token: ${response.status} ${errorText}`);
	}

	const data = await response.json();
	return data.access_token;
}
