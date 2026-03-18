package jobs

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"jobboard/jobs-service/internal/constants"
	"jobboard/jobs-service/internal/repository"
	"jobboard/jobs-service/internal/scrapers"
)

type Handler struct {
	repo       *repository.JobRepo
	scraperCfg scrapers.ScraperConfig
}

func NewHandler(repo *repository.JobRepo, cfg scrapers.ScraperConfig) *Handler {
	return &Handler{repo: repo, scraperCfg: cfg}
}

func apiError(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"code": code, "message": message})
}

// ListJobs handles GET /jobs
func (h *Handler) ListJobs(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Fire scrapers in background (non-blocking) on page 1
	if page == 1 {
		scrapers.FetchAllAsync(context.Background(), h.repo.Pool(), h.scraperCfg, q)
	}

	var salaryMin *int64
	if s := c.Query("salary_min"); s != "" {
		if v, err := strconv.ParseInt(s, 10, 64); err == nil {
			salaryMin = &v
		}
	}

	userIDStr, _ := c.Get(UserIDKey)
	uid, _ := userIDStr.(string)

	result, err := h.repo.ListJobs(c.Request.Context(), repository.JobFilter{
		Q:         q,
		Location:  strings.TrimSpace(c.Query("location")),
		JobType:   strings.TrimSpace(c.Query("job_type")),
		Remote:    c.Query("remote") == "true",
		SalaryMin: salaryMin,
		Page:      page,
		Limit:     limit,
	}, uid)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch jobs")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"jobs":  result.Jobs,
		"total": result.Total,
		"page":  result.Page,
		"limit": result.Limit,
	})
}

// GetJob handles GET /jobs/:id
func (h *Handler) GetJob(c *gin.Context) {
	id := c.Param("id")
	userIDStr, _ := c.Get(UserIDKey)
	uid, _ := userIDStr.(string)

	job, err := h.repo.GetJob(c.Request.Context(), id, uid)
	if err != nil {
		apiError(c, http.StatusNotFound, constants.ErrCodeNotFound, "Job not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"job": job})
}

// SaveJob handles POST /jobs/:id/save
func (h *Handler) SaveJob(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)
	if err := h.repo.SaveJob(c.Request.Context(), userID, c.Param("id")); err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeInternal, "Could not save job")
		return
	}
	c.JSON(http.StatusOK, gin.H{"saved": true})
}

// UnsaveJob handles DELETE /jobs/:id/save
func (h *Handler) UnsaveJob(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)
	_ = h.repo.UnsaveJob(c.Request.Context(), userID, c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"saved": false})
}

// ListSavedJobs handles GET /saved-jobs
func (h *Handler) ListSavedJobs(c *gin.Context) {
	userID := c.MustGet(UserIDKey).(string)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	jobs, err := h.repo.ListSavedJobs(c.Request.Context(), userID, page, limit)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch saved jobs")
		return
	}
	c.JSON(http.StatusOK, gin.H{"jobs": jobs})
}

// GetSalaryInsights handles GET /insights/salary
func (h *Handler) GetSalaryInsights(c *gin.Context) {
	insights, err := h.repo.GetSalaryInsights(c.Request.Context())
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch salary insights")
		return
	}
	c.JSON(http.StatusOK, gin.H{"insights": insights})
}

// GetSalaryBySource handles GET /insights/salary/sources
func (h *Handler) GetSalaryBySource(c *gin.Context) {
	data, err := h.repo.GetSalaryBySource(c.Request.Context())
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch salary by source")
		return
	}
	c.JSON(http.StatusOK, gin.H{"sources": data})
}

// GetTopPayingJobs handles GET /insights/salary/top
func (h *Handler) GetTopPayingJobs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	jobs, err := h.repo.GetTopPayingJobs(c.Request.Context(), limit)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch top paying jobs")
		return
	}
	c.JSON(http.StatusOK, gin.H{"jobs": jobs})
}

// ListCompanies handles GET /companies
func (h *Handler) ListCompanies(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	companies, total, err := h.repo.ListCompanies(c.Request.Context(), page, limit)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch companies")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"companies": companies,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

// GetCompanyProfile handles GET /companies/:slug
func (h *Handler) GetCompanyProfile(c *gin.Context) {
	slug := c.Param("slug")
	company, err := h.repo.GetCompanyProfile(c.Request.Context(), slug)
	if err != nil {
		apiError(c, http.StatusNotFound, constants.ErrCodeNotFound, "Company not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"company": company})
}

// GetCompanyJobs handles GET /companies/:slug/jobs
func (h *Handler) GetCompanyJobs(c *gin.Context) {
	slug := c.Param("slug")

	// Look up the company to get its name
	company, err := h.repo.GetCompanyProfile(c.Request.Context(), slug)
	if err != nil {
		apiError(c, http.StatusNotFound, constants.ErrCodeNotFound, "Company not found")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	jobs, total, err := h.repo.GetCompanyJobs(c.Request.Context(), company.Name, page, limit)
	if err != nil {
		apiError(c, http.StatusInternalServerError, constants.ErrCodeQueryFailed, "Failed to fetch company jobs")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"jobs":  jobs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
