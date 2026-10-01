-- SQL_STORED_PROCEDURE dbo.Mem_Application_One (modified 2012-04-21T07:54:31.013)

CREATE  PROCEDURE Mem_Application_One  
@ApplicationId varchar(20),
@Description Varchar(20) output

AS
/*
作者：小危 创建时间:2008-10-25 修改人：小危 修改时间：2008-10-25 
当前游戏分类
*/
select  top 1 @Description=Description from Mem_Application where isopen=0 and  ApplicationId=@ApplicationId
GO
