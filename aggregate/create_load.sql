create ts database sensors;

create table sensors.sensor_data(
    ts timestamp not null,
    normal_time timestamp not null,
    temperature smallint,
    temperature2 int,
    temperature3 bigint,
    stress float4,
    stress2 double)
    tags (ptagID int not null) primary tags (ptagID);

import into sensors.sensor_data CSV DATA ("nodelocal://1/sensors");
