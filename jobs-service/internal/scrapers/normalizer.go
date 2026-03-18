package scrapers

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"
	"unicode"
)

// Fingerprint computes SHA256(lower(title)|lower(company)|source)
func Fingerprint(title, company, source string) string {
	raw := strings.ToLower(strings.TrimSpace(title)) + "|" +
		strings.ToLower(strings.TrimSpace(company)) + "|" +
		strings.ToLower(source)
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// NormalizeTags lowercases, deduplicates, removes empty, limits to 20 tags
func NormalizeTags(raw []string) []string {
	seen := make(map[string]bool)
	out := make([]string, 0, len(raw))
	for _, t := range raw {
		t = strings.ToLower(strings.TrimSpace(t))
		t = strings.Map(func(r rune) rune {
			if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '+' || r == '#' || r == '.' || r == '-' {
				return r
			}
			return -1
		}, t)
		if t != "" && !seen[t] {
			seen[t] = true
			out = append(out, t)
		}
	}
	if len(out) > 20 {
		out = out[:20]
	}
	return out
}

// DetectRemote returns true if any remote indicators are found in text
func DetectRemote(texts ...string) bool {
	indicators := []string{"remote", "anywhere", "work from home", "wfh", "distributed", "🌎", "🌍", "🌏"}
	combined := strings.ToLower(strings.Join(texts, " "))
	for _, ind := range indicators {
		if strings.Contains(combined, ind) {
			return true
		}
	}
	return false
}

// NormalizeJobType maps various strings to standard values: full-time, part-time, contract, internship
func NormalizeJobType(raw string) string {
	r := strings.ToLower(raw)
	switch {
	case strings.Contains(r, "part"):
		return "part-time"
	case strings.Contains(r, "contract") || strings.Contains(r, "freelance"):
		return "contract"
	case strings.Contains(r, "intern"):
		return "internship"
	default:
		return "full-time"
	}
}

// NormalizeSalary attempts to convert hourly/monthly salaries to annual USD.
// Returns nil if salary cannot be determined.
func NormalizeSalary(amount float64, period string) *int64 {
	if amount <= 0 {
		return nil
	}
	var annual float64
	switch strings.ToLower(period) {
	case "hour", "hourly":
		annual = amount * 2080
	case "month", "monthly":
		annual = amount * 12
	default:
		annual = amount
	}
	v := int64(annual)
	return &v
}

// SafeTime returns t if valid, otherwise returns fallback (usually time.Now())
func SafeTime(t time.Time, fallback time.Time) time.Time {
	if t.IsZero() {
		return fallback
	}
	return t
}

// ExtractTagsFromText extracts common tech keywords from description text
func ExtractTagsFromText(text string) []string {
	keywords := []string{
		"go", "golang", "python", "javascript", "typescript", "java", "kotlin", "swift",
		"rust", "c++", "c#", "ruby", "php", "scala", "elixir", "haskell",
		"react", "vue", "angular", "nextjs", "nuxt", "svelte",
		"node", "nodejs", "express", "fastapi", "django", "rails", "spring",
		"postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
		"docker", "kubernetes", "k8s", "terraform", "aws", "gcp", "azure",
		"graphql", "rest", "grpc", "kafka", "rabbitmq",
		"machine learning", "ml", "ai", "deep learning", "llm",
		"linux", "git", "ci/cd", "devops", "sre",
	}
	lower := strings.ToLower(text)
	var found []string
	for _, kw := range keywords {
		if strings.Contains(lower, kw) {
			found = append(found, kw)
		}
	}
	return found
}

// Truncate truncates a string to maxLen runes
func Truncate(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen])
}

// stripHTML removes basic HTML tags from text
func stripHTML(s string) string {
	var b strings.Builder
	inTag := false
	for _, r := range s {
		switch {
		case r == '<':
			inTag = true
		case r == '>':
			inTag = false
			b.WriteRune(' ')
		case !inTag:
			b.WriteRune(r)
		}
	}
	return strings.TrimSpace(b.String())
}
