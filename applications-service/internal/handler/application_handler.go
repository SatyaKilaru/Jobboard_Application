package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobboard/applications-service/internal/constants"
	"jobboard/applications-service/internal/models"
	"jobboard/applications-service/internal/repository"
)

type Handler struct {
	repo *repository.ApplicationRepo
}

func NewHandler(repo *repository.ApplicationRepo) *Handler {
	return &Handler{repo: repo}
}

func apiError(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"code": code, "message": message})
}

var validStatuses = map[string]bool{
	"wishlist":  true,
	"applied":   true,
	"interview": true,
	"offer":     true,
	"rejected":  true,
	"withdrawn": true,
}

// ListApplications handles GET /applications
func (h *Handler) ListApplications(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)
	status := strings.TrimSpace(c.Query("status"))

	if status != "" && !validStatuses[status] {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "invalid status filter")
		return
	}

	apps, err := h.repo.ListByUser(c.Request.Context(), userID, status)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch applications")
		return
	}

	c.JSON(http.StatusOK, gin.H{"applications": apps})
}

// GetStats handles GET /applications/stats
func (h *Handler) GetStats(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)

	stats, err := h.repo.GetStats(c.Request.Context(), userID)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch stats")
		return
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

// GetApplication handles GET /applications/:id
func (h *Handler) GetApplication(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)
	appID := c.Param("id")

	app, err := h.repo.GetByID(c.Request.Context(), appID, userID)
	if err != nil {
		apiError(c, http.StatusNotFound, constants.ErrCodeNotFound, "Application not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{"application": app})
}

type createApplicationRequest struct {
	CompanyName string `json:"company_name" binding:"required"`
	JobTitle    string `json:"job_title" binding:"required"`
	JobURL      string `json:"job_url"`
	Status      string `json:"status"`
	Notes       string `json:"notes"`
	JobID       string `json:"job_id"`
}

// CreateApplication handles POST /applications
func (h *Handler) CreateApplication(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)

	var req createApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "company_name and job_title are required")
		return
	}

	status := req.Status
	if status == "" {
		status = "applied"
	}
	if !validStatuses[status] {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "invalid status")
		return
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "invalid user ID")
		return
	}

	app := models.Application{
		UserID:      uid,
		CompanyName: req.CompanyName,
		JobTitle:    req.JobTitle,
		JobURL:      req.JobURL,
		Status:      status,
		Notes:       req.Notes,
	}

	if req.JobID != "" {
		jobUUID, err := uuid.Parse(req.JobID)
		if err != nil {
			apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "invalid job_id")
			return
		}
		app.JobID = &jobUUID
	}

	created, err := h.repo.Create(c.Request.Context(), app)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeInternal, "Failed to create application")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"application": created})
}

type updateStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// UpdateStatus handles PATCH /applications/:id/status
func (h *Handler) UpdateStatus(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)
	appID := c.Param("id")

	var req updateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "status is required")
		return
	}

	if !validStatuses[req.Status] {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "invalid status")
		return
	}

	if err := h.repo.UpdateStatus(c.Request.Context(), appID, userID, req.Status); err != nil {
		apiError(c, http.StatusNotFound, constants.ErrCodeNotFound, "Application not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": "OK", "message": "status updated"})
}

type updateNotesRequest struct {
	Notes string `json:"notes"`
}

// UpdateNotes handles PATCH /applications/:id/notes
func (h *Handler) UpdateNotes(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)
	appID := c.Param("id")

	var req updateNotesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apiError(c, http.StatusBadRequest, constants.ErrCodeValidation, "invalid request body")
		return
	}

	if err := h.repo.UpdateNotes(c.Request.Context(), appID, userID, req.Notes); err != nil {
		apiError(c, http.StatusNotFound, constants.ErrCodeNotFound, "Application not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": "OK", "message": "notes updated"})
}

// DeleteApplication handles DELETE /applications/:id
func (h *Handler) DeleteApplication(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)
	appID := c.Param("id")

	if err := h.repo.Delete(c.Request.Context(), appID, userID); err != nil {
		apiError(c, http.StatusNotFound, constants.ErrCodeNotFound, "Application not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": "OK", "message": "application deleted"})
}
