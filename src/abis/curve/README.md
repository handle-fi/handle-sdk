Contracts complied from Vyper (all curve contracts are written using Vyper) break typechain if they include the gas property as a number, instead of a string. Additionally, these gas numbers are wildly incorrect. See https://github.com/dethcrypto/TypeChain/issues/677 for more info. When including a Vyper based contract abi, remove the 'gas' property entirely.

A regex for finding gas fields is `\,\n[\s]+"gas"[^\n]*\`
