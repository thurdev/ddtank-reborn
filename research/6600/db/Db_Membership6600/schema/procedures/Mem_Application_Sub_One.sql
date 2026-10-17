-- SQL_STORED_PROCEDURE dbo.Mem_Application_Sub_One (modified 2012-04-21T07:54:31.030)

CREATE  PROCEDURE Mem_Application_Sub_One 
@ApplicationId varchar(20),
@SubId varchar(20),
@Description varchar(20) output
AS
select Top 1  @Description =Description  from Mem_Application_Sub where ApplicationId=@ApplicationId And SubId=@SubId

GO
