# Swiss Ephemeris reference fixtures

`swetest_moshier_2_10_03.json` contains three synthetic cases produced by the
upstream `swetest` executable, built from the Swiss source bundled with
`pyswisseph==2.10.3.2`. The application and its Python binding were not imported
to generate the expected values. Matching raw output is preserved beside the
JSON; its SHA-256 values appear in the fixture.

This checks agreement between the application's integration and the upstream
reference executable. Both use the same underlying astronomy library. It does
not independently validate the astronomical model, file-backed Swiss results,
all birth dates, or psychological interpretation.

## Reproduce a case

Build `swetest` from
[`astrorigin/swisseph@696bda432298d482d27e67a0cf1238920301a7dd`](https://github.com/astrorigin/swisseph/tree/696bda432298d482d27e67a0cf1238920301a7dd)
with `make swetest`. Run the exact `swetest_args` recorded for each case in an
empty working directory, with `SE_EPHE_PATH` unset and no supplemental time-data
files installed. For example:

```bash
/absolute/path/to/swetest -b1.1.2000 -utc12:00:00 -p0123456789t -fPlbRs -g, -head -emos -house0.0,51.4779,P
```

`-utc` is intentional: civil UTC is converted to the TT/UT1 time scales.
`-ut` would be a different input convention. `-emos` explicitly selects Moshier.

The comparison tolerances are engineering thresholds, set before application
comparison: `1e-6` degrees for angles, `1e-6` degrees/day for longitude speed,
and `2e-9` AU for distance. They accommodate the reference executable's printed
precision. Angular comparisons use circular differences across 0/360 degrees.
These tolerances are not claims about absolute astronomical accuracy.

Do not regenerate expected values from the application under test. A new
reference requires recorded upstream source/version, commands, settings,
unmodified raw output, hashes, and a reviewed reason for changing expectations.
File-backed fixtures must also record the exact data files and SHA-256 hashes.
