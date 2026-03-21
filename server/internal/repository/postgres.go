package repository

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var reWhitespace = regexp.MustCompile(`\s+`)

func cleanSQL(sql string) string {
	return strings.TrimSpace(reWhitespace.ReplaceAllString(sql, " "))
}

type PostgresPool struct {
	Pool *pgxpool.Pool
}

type dbTracer struct{}

type ctxKey string

const queryInfoKey ctxKey = "queryInfo"

type queryInfo struct {
	sql       string
	args      []any
	startTime time.Time
}

func (d *dbTracer) TraceQueryStart(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	return context.WithValue(ctx, queryInfoKey, &queryInfo{
		sql:       cleanSQL(data.SQL),
		args:      data.Args,
		startTime: time.Now(),
	})
}

func (d *dbTracer) TraceQueryEnd(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryEndData) {
	info, ok := ctx.Value(queryInfoKey).(*queryInfo)
	duration := time.Duration(0)
	sqlStr := "unknown"
	var sqlArgs []any

	if ok {
		duration = time.Since(info.startTime)
		sqlStr = info.sql
		sqlArgs = info.args
	}

	if data.Err != nil {
		slog.Error("❌ SQL",
			"err", data.Err,
			"sql", sqlStr,
			"args", sqlArgs,
			"ms", duration.Milliseconds(),
		)
	} else {
		slog.Debug("⚙️ SQL",
			"sql", sqlStr,
			"args", sqlArgs,
			"ms", duration.Milliseconds(),
		)
	}
}

func NewPostgresPool(ctx context.Context, connString string) (*PostgresPool, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("unable to parse connection string: %w", err)
	}

	// Enable SQL Tracing
	config.ConnConfig.Tracer = &dbTracer{}

	// Performance & Resilience tuning for production
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return &PostgresPool{Pool: pool}, nil
}

func (p *PostgresPool) Close() {
	if p.Pool != nil {
		p.Pool.Close()
	}
}
