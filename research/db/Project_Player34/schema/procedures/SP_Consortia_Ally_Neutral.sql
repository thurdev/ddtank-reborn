-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Ally_Neutral (modified 2021-06-04T05:18:34.873)




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
