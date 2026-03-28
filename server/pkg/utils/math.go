package utils

import "math"

// Round1000 rounds a float64 to the nearest 1000 VND
// floor((x + 500) / 1000) * 1000
func Round1000(val float64) int64 {
	return int64(math.Floor((val+500)/1000)) * 1000
}
