-- SQL_STORED_PROCEDURE dbo.Mem_Application_Search (modified 2012-04-21T07:54:31.123)
CREATE PROCEDURE Mem_Application_Search  AS
/*
作者：小危 创建时间:2008-10-25 修改人：小危 修改时间：2008-10-25 
当前游戏分类
*/
select * from Mem_Application where isopen=0
GO
