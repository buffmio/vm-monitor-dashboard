package collector

import (
	"bufio"
	"errors"
	"net"
	"os"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type Snapshot struct {
	ExternalID     string   `json:"externalId"`
	Name           string   `json:"name"`
	IPAddress      string   `json:"ipAddress"`
	Host           string   `json:"host"`
	Location       string   `json:"location"`
	OS             string   `json:"os"`
	Environment    string   `json:"environment"`
	VCPU           int      `json:"vcpu"`
	MemoryGB       int      `json:"memoryGb"`
	StorageGB      int      `json:"storageGb"`
	UptimeSeconds  int64    `json:"uptimeSeconds"`
	CPUPercent     float64  `json:"cpuPercent"`
	MemoryPercent  float64  `json:"memoryPercent"`
	DiskPercent    float64  `json:"diskPercent"`
	NetworkInMbps  float64  `json:"networkInMbps"`
	NetworkOutMbps float64  `json:"networkOutMbps"`
	Tags           []string `json:"tags"`
}

func Collect(location string) (Snapshot, error) {
	hostname, _ := os.Hostname()
	ip := primaryIP()
	uptime, _ := readUptime()
	memPercent, memGB, _ := readMemory()
	diskPercent, storageGB, _ := readDisk("/")
	cpuPercent, networkIn, networkOut, _ := sampleCPUAndNetwork(1 * time.Second)

	if hostname == "" {
		return Snapshot{}, errors.New("hostname is empty")
	}
	return Snapshot{
		ExternalID:    hostname,
		Name:          hostname,
		IPAddress:     ip,
		Host:          hostname,
		Location:      location,
		OS:            runtime.GOOS,
		Environment:   detectVirtualizationEnvironment(),
		VCPU:          runtime.NumCPU(),
		MemoryGB:      memGB,
		StorageGB:     storageGB,
		UptimeSeconds: uptime,
		CPUPercent:    cpuPercent,
		MemoryPercent: memPercent,
		DiskPercent:   diskPercent,
		NetworkInMbps: networkIn,
		NetworkOutMbps: networkOut,
		Tags:          []string{"agent"},
	}, nil
}

func primaryIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok || ipNet.IP.IsLoopback() {
			continue
		}
		ip := ipNet.IP.To4()
		if ip != nil {
			return ip.String()
		}
	}
	return ""
}

func readUptime() (int64, error) {
	body, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0, err
	}
	fields := strings.Fields(string(body))
	if len(fields) == 0 {
		return 0, errors.New("invalid /proc/uptime")
	}
	value, err := strconv.ParseFloat(fields[0], 64)
	return int64(value), err
}

func readMemory() (percent float64, totalGB int, err error) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0, err
	}
	defer file.Close()

	values := map[string]float64{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 2 {
			continue
		}
		value, err := strconv.ParseFloat(fields[1], 64)
		if err == nil {
			values[strings.TrimSuffix(fields[0], ":")] = value
		}
	}
	total := values["MemTotal"]
	available := values["MemAvailable"]
	if total <= 0 {
		return 0, 0, scanner.Err()
	}
	return ((total - available) / total) * 100, int((total*1024 + (1 << 30) - 1) / (1 << 30)), scanner.Err()
}

func readDisk(path string) (percent float64, totalGB int, err error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, 0, err
	}
	total := float64(stat.Blocks) * float64(stat.Bsize)
	available := float64(stat.Bavail) * float64(stat.Bsize)
	if total <= 0 {
		return 0, 0, nil
	}
	return ((total - available) / total) * 100, int((total + (1 << 30) - 1) / (1 << 30)), nil
}

type cpuStat struct {
	idle  uint64
	total uint64
}

type networkStat struct {
	inBytes  uint64
	outBytes uint64
}

func sampleCPUAndNetwork(interval time.Duration) (cpuPercent float64, networkInMbps float64, networkOutMbps float64, err error) {
	cpuBefore, err := readCPUStat()
	if err != nil {
		return 0, 0, 0, err
	}
	networkBefore, _ := readNetworkStat()
	time.Sleep(interval)
	cpuAfter, err := readCPUStat()
	if err != nil {
		return 0, 0, 0, err
	}
	networkAfter, _ := readNetworkStat()

	totalDelta := cpuAfter.total - cpuBefore.total
	idleDelta := cpuAfter.idle - cpuBefore.idle
	if totalDelta > 0 {
		cpuPercent = (float64(totalDelta-idleDelta) / float64(totalDelta)) * 100
	}
	seconds := interval.Seconds()
	if seconds > 0 && networkAfter.inBytes >= networkBefore.inBytes && networkAfter.outBytes >= networkBefore.outBytes {
		networkInMbps = float64(networkAfter.inBytes-networkBefore.inBytes) / seconds / 1024 / 1024
		networkOutMbps = float64(networkAfter.outBytes-networkBefore.outBytes) / seconds / 1024 / 1024
	}
	return cpuPercent, networkInMbps, networkOutMbps, nil
}

func readCPUStat() (cpuStat, error) {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return cpuStat{}, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if !scanner.Scan() {
		return cpuStat{}, scanner.Err()
	}
	fields := strings.Fields(scanner.Text())
	if len(fields) < 5 || fields[0] != "cpu" {
		return cpuStat{}, errors.New("invalid /proc/stat cpu line")
	}
	var values []uint64
	for _, field := range fields[1:] {
		value, err := strconv.ParseUint(field, 10, 64)
		if err != nil {
			return cpuStat{}, err
		}
		values = append(values, value)
	}
	var total uint64
	for _, value := range values {
		total += value
	}
	idle := values[3]
	if len(values) > 4 {
		idle += values[4]
	}
	return cpuStat{idle: idle, total: total}, nil
}

func readNetworkStat() (networkStat, error) {
	file, err := os.Open("/proc/net/dev")
	if err != nil {
		return networkStat{}, err
	}
	defer file.Close()

	var stat networkStat
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		parts := strings.Split(line, ":")
		if len(parts) != 2 {
			continue
		}
		name := strings.TrimSpace(parts[0])
		if name == "lo" {
			continue
		}
		fields := strings.Fields(parts[1])
		if len(fields) < 16 {
			continue
		}
		inBytes, _ := strconv.ParseUint(fields[0], 10, 64)
		outBytes, _ := strconv.ParseUint(fields[8], 10, 64)
		stat.inBytes += inBytes
		stat.outBytes += outBytes
	}
	return stat, scanner.Err()
}

func detectVirtualizationEnvironment() string {
	if body, err := os.ReadFile("/proc/sys/kernel/osrelease"); err == nil {
		value := strings.ToLower(string(body))
		if strings.Contains(value, "microsoft") || strings.Contains(value, "wsl") {
			return "WSL2"
		}
	}

	product := readFirstExisting(
		"/sys/class/dmi/id/product_name",
		"/sys/class/dmi/id/board_vendor",
	)
	vendor := readFirstExisting(
		"/sys/class/dmi/id/sys_vendor",
		"/sys/class/dmi/id/bios_vendor",
	)
	source := strings.ToLower(product + " " + vendor)
	switch {
	case strings.Contains(source, "vmware"):
		return "VMware"
	case strings.Contains(source, "virtualbox"):
		return "VirtualBox"
	case strings.Contains(source, "kvm"):
		return "KVM"
	case strings.Contains(source, "qemu"):
		return "QEMU"
	case strings.Contains(source, "xen"):
		return "Xen"
	case strings.Contains(source, "hyper-v") || strings.Contains(source, "microsoft"):
		return "Hyper-V"
	case strings.Contains(source, "amazon") || strings.Contains(source, "ec2"):
		return "AWS EC2"
	case strings.Contains(source, "google"):
		return "Google Compute Engine"
	case strings.Contains(source, "azure"):
		return "Azure VM"
	}

	if body, err := os.ReadFile("/proc/cpuinfo"); err == nil {
		value := strings.ToLower(string(body))
		if strings.Contains(value, "hypervisor") {
			return "Virtualized"
		}
	}
	return "Physical or unknown"
}

func readFirstExisting(paths ...string) string {
	for _, path := range paths {
		body, err := os.ReadFile(path)
		if err == nil {
			value := strings.TrimSpace(string(body))
			if value != "" {
				return value
			}
		}
	}
	return ""
}
