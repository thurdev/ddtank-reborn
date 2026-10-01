-- SQL_STORED_PROCEDURE dbo.Sp_Sys_DataBaseSet (modified 2021-06-04T05:18:35.747)


CREATE PROCEDURE [dbo].[Sp_Sys_DataBaseSet] AS
/*1. 不要使用自动收缩, 自动收缩会定期收容数据文件的空闲空间,则处理需要的时候却要扩大数据文件,这两者相反的处理,是冲突的*/
ALTER DATABASE Db_Tank SET AUTO_SHRINK OFF

/*2. 如果你不进行事务日志备份, 也不需要利用事务日志做处理,则可以将数据库恢复模型设置为SIMPLE, 减少日志记录, 减轻磁盘I/O压力*/
ALTER DATABASE Db_Tank SET RECOVERY SIMPLE

/*3. 设置更小的文件增长步骤,以减少每次数据文件分配空间所需要的时间*/
ALTER DATABASE Db_Tank 
MODIFY FILE(
NAME='Db_Tank_Data',
FILEGROWTH=500 MB)  --不要使用百分比, 不然数据文件大了的话,这个百分比的结果就很大

ALTER DATABASE Db_Tank 
MODIFY FILE(
NAME='Db_Tank_Log',
FILEGROWTH=300 MB)  --不要使用百分比, 不然数据文件大了的话,这个百分比的结果就很大

/*4. 如果通过上述处理还无法解决问题,则应该考虑你的磁盘I/O性能不行,考虑提高硬件配置. */

/*5为数据文件预先分配足够大的空间,避免数据处理时分配空间*/
--暂不使用
--ALTER DATABASE MyDataBase 
--MODIFY FILE(
--NAME='MyDataBase_Date',
--SIZE=500 GB)  -- 预设数据文件大小为500GB







GO
