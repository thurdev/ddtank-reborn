-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Ally_Neutral (modified 2015-01-25T14:04:48.507)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<会会组织：查找公会关系>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Ally_Neutral]
@ConsortiaID int
as
select Consortia1ID,Consortia2ID,State from Consortia_Ally 
where IsExist=1  and (Consortia1ID =@ConsortiaID  or Consortia2ID = @ConsortiaID ) and state<>0

GO
