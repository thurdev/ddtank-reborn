-- SQL_STORED_PROCEDURE dbo.Membership_InsertRoot_Sto (modified 2012-04-21T07:53:25.060)
--Author：keny  Date：2009-12-31   Description：添加父节点

CREATE proc Membership_InsertRoot_Sto

@moduleId int,
@moduleName nvarchar(20),
@addTime nvarchar(20),
@description nvarchar(50)
as
begin
select @moduleId = max(moduleId) from db_membership.dbo.mem_module where applicationid=3 and parmoduleid=0
insert db_membership.dbo.mem_module values(3,@moduleId+1000,@moduleName,0,@addTime,@description)
end

GO
