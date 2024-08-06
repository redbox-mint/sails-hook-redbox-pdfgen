#!/bin/bash
# version="0.1"
#
# This is an optional arguments-only example of Argbash potential
#
# ARG_OPTIONAL_BOOLEAN([angular],[a],[Angular mode. Will ensure permissions are set correctly on the Sails working directory so that changes can be applied],[])
# ARG_HELP([ReDBox Sails Hook Run Utility])
# ARGBASH_GO()
# needed because of Argbash --> m4_ignore([
### START OF CODE GENERATED BY Argbash v2.6.1 one line above ###
# Argbash is a bash code generator used to get arguments parsing right.
# Argbash is FREE SOFTWARE, see https://argbash.io for more info
# Generated online by https://argbash.io/generate

die()
{
	local _ret=$2
	test -n "$_ret" || _ret=1
	test "$_PRINT_HELP" = yes && print_help >&2
	echo "$1" >&2
	exit ${_ret}
}

begins_with_short_option()
{
	local first_option all_short_options
	all_short_options='ah'
	first_option="${1:0:1}"
	test "$all_short_options" = "${all_short_options/$first_option/}" && return 1 || return 0
}



# THE DEFAULTS INITIALIZATION - OPTIONALS
_arg_angular="off"

print_help ()
{
	printf '%s\n' "ReDBox Sails Hook Run Utility"
	printf 'Usage: %s [-a|--(no-)angular] [-h|--help]\n' "$0"
	printf '\t%s\n' "-a,--angular,--no-angular: Angular mode. Will ensure permissions are set correctly on the Sails working directory so that changes can be applied (off by default)"
	printf '\t%s\n' "-h,--help: Prints help"
}

parse_commandline ()
{
	while test $# -gt 0
	do
		_key="$1"
		case "$_key" in
			-a|--no-angular|--angular)
				_arg_angular="on"
				test "${1:0:5}" = "--no-" && _arg_angular="off"
				;;
			-a*)
				_arg_angular="on"
				_next="${_key##-a}"
				if test -n "$_next" -a "$_next" != "$_key"
				then
					begins_with_short_option "$_next" && shift && set -- "-a" "-${_next}" "$@" || die "The short option '$_key' can't be decomposed to ${_key:0:2} and -${_key:2}, because ${_key:0:2} doesn't accept value and '-${_key:2:1}' doesn't correspond to a short option."
				fi
				;;
			-h|--help)
				print_help
				exit 0
				;;
			-h*)
				print_help
				exit 0
				;;
			*)
				_PRINT_HELP=yes die "FATAL ERROR: Got an unexpected argument '$1'" 1
				;;
		esac
		shift
	done
}

parse_commandline "$@"

# OTHER STUFF GENERATED BY Argbash

### END OF CODE GENERATED BY Argbash (sortof) ### ])
# [ <-- needed because of Argbash

npm run dev:host

# install packages for this hook
npm install

# Starts docker compose
npm run dev:docker

# ] <-- needed because of Argbash
