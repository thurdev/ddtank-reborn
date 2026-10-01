-- SQL_STORED_PROCEDURE dbo.Mem_Application_Sub_Search (modified 2012-04-21T07:54:31.123)

CREATE  PROCEDURE Mem_Application_Sub_Search
@ApplicationId INTEGER 
  AS
select * from Mem_Application_Sub where ApplicationId=@ApplicationId
/*
作者：小危 创建时间:2008-10-25 修改人：小危 修改时间：2008-10-25 
当前服务器数据
*/

GO
