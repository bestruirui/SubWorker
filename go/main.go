package main

import (
	"fmt"
	"os"

	"github.com/dop251/goja"
)

const RAW = `dmxlc3M6Ly9kNmIxMzI3ZC0yYmVjLTQzNjYtYTNhMS05YjEyODRmOTU4NDFAMTM4LjEyNC43OS45OjQ0Mz9zZWN1cml0eT1yZWFsaXR5JnR5cGU9dGNwJnNuaT1zdW42LTIxLnVzZXJhcGkuY29tJmZwPWNocm9tZSZmbG93PXh0bHMtcnByeC12aXNpb24mc2lkPTZiYTg1MTc5ZTMwZDRmYzImcGJrPVNiVktPRU1qSzBzSWxid2c0YWt5Qmc1bUw1S1p3d0ItZWQ0ZUVFN1luUmMjQ0hfc3BlZWRub2RlXzAwMDE=`
const TARGET = "mihomo"

func main() {
	substoreJS, err := os.ReadFile("../backend/dist/subconv.es5.js")
	if err != nil {
		panic(err)
	}
	vm := goja.New()
	_, err = vm.RunString(string(substoreJS))
	if err != nil {
		panic(fmt.Sprintf("failed to load substore.js: %v", err))
	}
	vm.Set("console", map[string]interface{}{
		"log": fmt.Println,
	})
	vm.Set("_raw", RAW)
	vm.Set("_target", TARGET)

	result, err := vm.RunString(`SubConv.ProxyUtils.convert(_raw, _target)`)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(result.String())
}
